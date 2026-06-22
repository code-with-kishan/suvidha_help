const speechLocaleByLanguage = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  pa: 'pa-IN',
  ur: 'ur-IN',
  ne: 'ne-NP',
  ks: 'ur-IN',
  doi: 'hi-IN'
};

let speechRequestId = 0;
let speechQueue = Promise.resolve();
let activeRecognition = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSpeechLocale = (language) => speechLocaleByLanguage[language] || 'en-IN';

export const normalizeTranscript = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const splitText = (text, maxLen = 170) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const segments = normalized.split(/(?<=[.!?।])\s+/);
  const chunks = [];
  let current = '';

  for (const segment of segments) {
    const candidate = current ? `${current} ${segment}` : segment;
    if (candidate.length <= maxLen) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    if (segment.length <= maxLen) {
      current = segment;
      continue;
    }

    for (let index = 0; index < segment.length; index += maxLen) {
      chunks.push(segment.slice(index, index + maxLen));
    }
    current = '';
  }

  if (current) chunks.push(current);
  return chunks;
};

const getSpeechRecognitionCtor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export const isVoiceOutputSupported = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
};

export const isVoiceCommandSupported = () => Boolean(getSpeechRecognitionCtor());

const enqueueSpeech = (task) => {
  speechQueue = speechQueue.then(task, task);
  return speechQueue;
};

const getVoicesWithTimeout = async (synth, timeoutMs = 1800) => {
  const immediate = synth.getVoices() || [];
  if (immediate.length) return immediate;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      synth.onvoiceschanged = null;
      resolve(synth.getVoices() || []);
    }, timeoutMs);

    synth.onvoiceschanged = () => {
      clearTimeout(timer);
      synth.onvoiceschanged = null;
      resolve(synth.getVoices() || []);
    };
  });
};

const chooseVoice = (voices, locale) => {
  if (!voices?.length) return null;
  const baseLocale = locale.split('-')[0];
  return (
    voices.find((voice) => voice.lang === locale) ||
    voices.find((voice) => voice.lang?.startsWith(baseLocale)) ||
    voices.find((voice) => voice.default) ||
    voices.find((voice) => voice.lang?.startsWith('en')) ||
    null
  );
};

const speakChunk = ({ synth, chunk, voice, locale, volume, requestId, onStatus }) =>
  new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = voice?.lang || locale;
    utterance.voice = voice || null;
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.volume = volume;

    let settled = false;
    let started = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      resolve(ok);
    };

    const watchdog = setTimeout(() => {
      finish(started);
    }, 10000);

    utterance.onstart = () => {
      started = true;
      if (speechRequestId !== requestId) {
        clearTimeout(watchdog);
        finish(true);
        return;
      }
      onStatus?.('speaking');
    };

    utterance.onend = () => {
      clearTimeout(watchdog);
      finish(true);
    };

    utterance.onerror = (event) => {
      clearTimeout(watchdog);
      if (speechRequestId !== requestId) {
        finish(true);
        return;
      }
      const errorType = String(event?.error || '').toLowerCase();
      if (errorType === 'interrupted' || errorType === 'canceled' || errorType === 'cancelled') {
        finish(true);
        return;
      }
      finish(false);
    };

    try {
      synth.speak(utterance);
    } catch (_error) {
      clearTimeout(watchdog);
      finish(false);
    }
  });

const speakImmediateFromGesture = ({ text, language, volume, requestId, onStatus, forceDefaultLang = false }) =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve(false);
      return;
    }

    const synth = window.speechSynthesis;
    try {
      synth.resume?.();
    } catch (_error) {
      // ignore
    }

    const firstChunk = splitText(String(text || '').trim(), 120)[0] || String(text || '').trim();
    const utterance = new SpeechSynthesisUtterance(firstChunk);
    if (!forceDefaultLang) {
      utterance.lang = getSpeechLocale(language);
    }
    utterance.rate = 1;
    utterance.pitch = 1;
    const safeVolume = Number.isFinite(volume) ? Math.min(1, Math.max(0.45, volume)) : 0.75;
    utterance.volume = safeVolume;

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      resolve(ok);
    };

    const watchdog = setTimeout(() => {
      finish(false);
    }, 5000);

    utterance.onstart = () => {
      clearTimeout(watchdog);
      if (speechRequestId !== requestId) {
        finish(true);
        return;
      }
      onStatus?.('speaking');
      finish(true);
    };

    utterance.onend = () => {
      onStatus?.('ready');
    };

    utterance.onerror = (event) => {
      clearTimeout(watchdog);
      const errorType = String(event?.error || '').toLowerCase();
      if (errorType === 'interrupted' || errorType === 'canceled' || errorType === 'cancelled') {
        finish(true);
        return;
      }
      finish(false);
    };

    try {
      synth.speak(utterance);
    } catch (_error) {
      clearTimeout(watchdog);
      finish(false);
    }
  });

const resetSynthIfBusy = async (synth) => {
  if (!synth.speaking && !synth.pending) return;
  try {
    synth.cancel();
  } catch (_error) {
    // ignore
  }
  await wait(120);
};

export const stopVoiceAssistant = () => {
  speechRequestId += 1;
  speechQueue = Promise.resolve();

  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
  } catch (_error) {
    // ignore
  }
};

export const stopVoiceCommandListener = () => {
  if (!activeRecognition) return;
  try {
    activeRecognition.onstart = null;
    activeRecognition.onresult = null;
    activeRecognition.onerror = null;
    activeRecognition.onend = null;
    activeRecognition.stop();
  } catch (_error) {
    // ignore
  }
  activeRecognition = null;
};

export const speakWithVoiceAssistant = async ({
  text,
  language,
  volume = 1,
  onStatus,
  userInitiated = false,
  skipQuickStart = false
}) => {
  void userInitiated;
  void skipQuickStart;

  const requestId = ++speechRequestId;
  onStatus?.('starting');

  if (userInitiated) {
    const immediateOk = await speakImmediateFromGesture({
      text,
      language,
      volume,
      requestId,
      onStatus
    });
    if (immediateOk) {
      return true;
    }

    const immediateFallbackOk = await speakImmediateFromGesture({
      text,
      language,
      volume,
      requestId,
      onStatus,
      forceDefaultLang: true
    });
    if (immediateFallbackOk) {
      return true;
    }
  }

  return enqueueSpeech(async () => {
    if (!isVoiceOutputSupported()) {
      onStatus?.('unsupported');
      return false;
    }

    if (speechRequestId !== requestId) {
      onStatus?.('ready');
      return true;
    }

    const normalizedText = String(text || '').trim();
    if (!normalizedText) {
      onStatus?.('ready');
      return true;
    }

    const synth = window.speechSynthesis;
    const locale = getSpeechLocale(language);
    const safeVolume = Number.isFinite(volume) ? Math.min(1, Math.max(0.45, volume)) : 0.75;
    const chunks = splitText(normalizedText);

    try {
      synth.resume?.();
    } catch (_error) {
      // ignore
    }

    await resetSynthIfBusy(synth);

    const voices = await getVoicesWithTimeout(synth);
    const preferredVoice = chooseVoice(voices, locale);
    const fallbackVoice = chooseVoice(voices, 'en-IN');

    const strategies = [
      { primaryVoice: preferredVoice, secondaryVoice: fallbackVoice, primaryLocale: locale },
      { primaryVoice: null, secondaryVoice: null, primaryLocale: 'en-IN' }
    ];

    for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex += 1) {
      const strategy = strategies[strategyIndex];
      if (strategyIndex > 0) {
        await resetSynthIfBusy(synth);
        await wait(140);
      }

      let strategyOk = true;
      for (const chunk of chunks) {
        if (speechRequestId !== requestId) {
          onStatus?.('ready');
          return true;
        }

        let ok = await speakChunk({
          synth,
          chunk,
          voice: strategy.primaryVoice,
          locale: strategy.primaryLocale,
          volume: safeVolume,
          requestId,
          onStatus
        });

        if (!ok && strategy.secondaryVoice && strategy.secondaryVoice !== strategy.primaryVoice) {
          await wait(120);
          ok = await speakChunk({
            synth,
            chunk,
            voice: strategy.secondaryVoice,
            locale: strategy.primaryLocale,
            volume: safeVolume,
            requestId,
            onStatus
          });
        }

        if (!ok) {
          strategyOk = false;
          break;
        }

        await wait(50);
      }

      if (strategyOk) {
        onStatus?.('ready');
        return true;
      }
    }

    onStatus?.('error');
    return false;
  });
};

export const startVoiceCommandListener = ({ language, onTranscript, onError, onStatus }) => {
  const RecognitionCtor = getSpeechRecognitionCtor();
  if (!RecognitionCtor) {
    onError?.('Voice commands not supported in this browser.');
    return false;
  }

  stopVoiceCommandListener();

  const recognition = new RecognitionCtor();
  recognition.lang = getSpeechLocale(language);
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    onStatus?.('listening');
  };

  recognition.onresult = (event) => {
    const transcript = event?.results?.[0]?.[0]?.transcript || '';
    onTranscript?.(normalizeTranscript(transcript));
  };

  recognition.onerror = (event) => {
    const message = event?.error ? `Voice command error: ${event.error}` : 'Voice command failed.';
    onError?.(message);
    onStatus?.('idle');
  };

  recognition.onend = () => {
    onStatus?.('idle');
    activeRecognition = null;
  };

  activeRecognition = recognition;

  try {
    onStatus?.('starting');
    recognition.start();
    return true;
  } catch (_error) {
    activeRecognition = null;
    onStatus?.('idle');
    onError?.('Unable to start voice command listener.');
    return false;
  }
};
