import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getOfflineQueueSize, syncOfflineQueue } from '../services/offlineSync';
import {
  isVoiceCommandSupported,
  isVoiceOutputSupported,
  normalizeTranscript,
  speakWithVoiceAssistant,
  startVoiceCommandListener,
  stopVoiceAssistant,
  stopVoiceCommandListener
} from '../services/voiceAssistant';
import {
  logout,
  setAudioGuidance,
  setAudioVolume,
  setFontScale,
  setHeadphoneMode,
  setHighContrast,
  setThemeMode
} from '../redux/store';
import LanguageToggle from './LanguageToggle';
import OfflineAssistantWidget from './OfflineAssistantWidget';

const IDLE_TIMEOUT_MS = 45 * 1000;
const AUTO_RESET_SECONDS = 10;

const conversationalReplies = {
  en: {
    greeting: 'Hello. I am your Community Hero voice assistant. You can say login page, dashboard, report issue, escalation, payment, or tracking.',
    howAreYou: 'I am ready to help you. Please tell me what you want to do.',
    whoAreYou: 'I am Community Hero service assistant. I can help report, track, and follow up on local issues by voice.',
    thanks: 'You are welcome. I am always ready to help.',
    unknown: 'I did not understand that. You can say login page, dashboard, report issue, escalation, payment, tracking, or help.'
  },
  hi: {
    greeting: 'नमस्ते। मैं आपका Community Hero वॉइस असिस्टेंट हूँ। आप लॉगिन पेज, डैशबोर्ड, इश्यू रिपोर्ट, एस्केलेशन, भुगतान या ट्रैकिंग बोल सकते हैं।',
    howAreYou: 'मैं आपकी मदद के लिए तैयार हूँ। कृपया बताइए आपको क्या करना है।',
    whoAreYou: 'मैं Community Hero सेवा असिस्टेंट हूँ। मैं स्थानीय समस्याओं को रिपोर्ट करने और ट्रैक करने में आवाज़ से मदद करता हूँ।',
    thanks: 'धन्यवाद। मैं हमेशा आपकी मदद के लिए तैयार हूँ।',
    unknown: 'मैं समझ नहीं पाया। आप लॉगिन पेज, डैशबोर्ड, इश्यू रिपोर्ट, एस्केलेशन, भुगतान, ट्रैकिंग या हेल्प बोल सकते हैं।'
  }
};

const getReplyPack = (language) => conversationalReplies[language] || conversationalReplies.en;

export default function Layout({ children, title }) {
  const headerLogoSrc = '/branding/suvidha-header-logo.png';
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { highContrast, fontScale, audioGuidance, audioVolume, headphoneMode, language, themeMode } = useSelector(
    (state) => state.ui
  );
  const idleTimerRef = useRef(null);
  const autoResetRef = useRef(null);
  const lastAutoGuideKeyRef = useRef('');
  const pendingAutoGuideRef = useRef('');
  const pendingVoiceFieldRef = useRef(null);
  const pendingRouteVoiceFlowRef = useRef(null);
  const suppressAutoGuideOnceRef = useRef(false);
  const [isIdle, setIsIdle] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(isVoiceOutputSupported());
  const [voiceCommandSupported, setVoiceCommandSupported] = useState(isVoiceCommandSupported());
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [uiNotice, setUiNotice] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [isHeaderLogoMissing, setIsHeaderLogoMissing] = useState(false);

  const getVoiceGuideTextForPath = useCallback(
    (path) => {
    if (path === '/dashboard') return t('voiceGuideDashboard');
    if (path.startsWith('/services')) return t('voiceGuideServices');
    if (path.startsWith('/complaints')) return t('voiceGuideComplaints');
    if (path.startsWith('/payment')) return t('voiceGuidePayment');
    if (path.startsWith('/status-tracking')) return t('voiceGuideTracking');
    if (path === '/login') return t('voiceGuideLogin');
    if (path.startsWith('/admin')) return t('voiceGuideAdmin');
    return t('voiceGuideGeneric');
    },
    [t]
  );

  const getVoiceGuideText = useCallback(() => getVoiceGuideTextForPath(location.pathname), [getVoiceGuideTextForPath, location.pathname]);


  const showNotice = useCallback((text) => {
    setUiNotice(text);
    setTimeout(() => {
      setUiNotice('');
    }, 2600);
  }, []);

  const speakAssistant = useCallback(
    async (message, userInitiated = false) => {
      const effectiveVolume = Math.min(1, Math.max(0, headphoneMode ? audioVolume + 0.1 : audioVolume));
      let ok = await speakWithVoiceAssistant({
        text: message,
        language,
        volume: effectiveVolume,
        onStatus: setVoiceStatus,
        userInitiated
      });

      if (!ok && userInitiated) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        ok = await speakWithVoiceAssistant({
          text: message,
          language,
          volume: effectiveVolume,
          onStatus: setVoiceStatus,
          userInitiated: false,
          skipQuickStart: true
        });
      }

      if (!ok) {
        setVoiceStatus('ready');
        if (userInitiated) {
          showNotice('Voice playback was interrupted. Please try again.');
        }
      }

      return ok;
    },
    [audioVolume, headphoneMode, language, showNotice]
  );

  const speakFromUserAction = useCallback(() => {
    if (!audioGuidance) {
      showNotice('Turn on Audio Guidance first.');
      return;
    }
    pendingAutoGuideRef.current = '';
    suppressAutoGuideOnceRef.current = true;
    speakAssistant(`${title || t('appTitle')}. ${getVoiceGuideText()}`, true);
  }, [audioGuidance, getVoiceGuideText, showNotice, speakAssistant, t, title]);

  const emitVoiceFieldFill = useCallback((field, value, source = 'voice') => {
    const payload = {
      field,
      value,
      source,
      language,
      path: location.pathname,
      timestamp: Date.now()
    };
    window.dispatchEvent(new CustomEvent('suvidha:voice-fill', { detail: payload }));
  }, [language, location.pathname]);

  const startVoiceFieldCapture = useCallback(
    ({ field, prompt, source = 'voice', attempt = 0 }) => {
      if (!voiceCommandSupported) {
        showNotice('Voice input is not supported in this browser.');
        return;
      }

      pendingVoiceFieldRef.current = { field, prompt, source, attempt };
      const isLoginFlow = String(source || '').startsWith('login-');
      const maxAttempts = isLoginFlow ? 5 : 2;

      const isLikelyPromptEcho = (transcript, promptText) => {
        const spoken = normalizeTranscript(transcript);
        const promptNormalized = normalizeTranscript(promptText);
        if (!spoken || !promptNormalized) return false;
        if (spoken === promptNormalized) return true;
        if (spoken.includes(promptNormalized) || promptNormalized.includes(spoken)) return true;
        return /(please say|कृपया|say your|अपना)/.test(spoken);
      };

      const startListening = () => {
        stopVoiceAssistant();
        const started = startVoiceCommandListener({
          language,
          onStatus: (status) => {
            setIsVoiceListening(status === 'listening');
          },
          onTranscript: (transcript) => {
            setIsVoiceListening(false);
            const normalized = normalizeTranscript(transcript);
            if (!normalized) {
              const capture = pendingVoiceFieldRef.current;
              if (!capture) return;
              const nextAttempt = Number(capture.attempt || 0) + 1;
              if (String(capture.source || '').startsWith('login-') && nextAttempt <= maxAttempts) {
                showNotice(`No voice input detected for ${capture.field}. Retrying...`);
                startVoiceFieldCapture({
                  field: capture.field,
                  prompt: capture.prompt,
                  source: capture.source,
                  attempt: nextAttempt
                });
                return;
              }
              showNotice('No voice input detected for the field.');
              return;
            }
            const capture = pendingVoiceFieldRef.current;
            if (!capture) return;

            const isCaptureLoginFlow = String(capture.source || '').startsWith('login-');
            if (isCaptureLoginFlow && isLikelyPromptEcho(transcript, capture.prompt || '')) {
              showNotice('Heard assistant prompt. Please speak your response now.');
              setTimeout(startListening, 220);
              return;
            }

            emitVoiceFieldFill(capture.field, transcript, capture.source);
            pendingVoiceFieldRef.current = null;
            if (audioGuidance && !isCaptureLoginFlow) {
              const replyPack = getReplyPack(language);
              speakAssistant(`Received ${capture.field}. ${replyPack.thanks}`, true);
            }
            showNotice(`${field} captured from voice.`);
          },
          onError: (message) => {
            setIsVoiceListening(false);
            const capture = pendingVoiceFieldRef.current;
            const nextAttempt = Number(capture?.attempt || 0) + 1;
            if (capture && String(capture.source || '').startsWith('login-') && nextAttempt <= maxAttempts) {
              showNotice('Voice input issue detected. Re-asking current step...');
              startVoiceFieldCapture({
                field: capture.field,
                prompt: capture.prompt,
                source: capture.source,
                attempt: nextAttempt
              });
              return;
            }
            showNotice(message || 'Voice field input failed.');
          }
        });

        if (!started) {
          setIsVoiceListening(false);
          showNotice('Could not start voice field input.');
        }
      };

      const runCapture = async () => {
        if (prompt && isLoginFlow) {
          const effectiveVolume = Math.min(1, Math.max(0, headphoneMode ? audioVolume + 0.1 : audioVolume));
          const spoke = await speakWithVoiceAssistant({
            text: prompt,
            language,
            volume: effectiveVolume,
            onStatus: setVoiceStatus,
            userInitiated: true,
            skipQuickStart: true
          });

          if (!spoke && attempt < maxAttempts) {
            showNotice('Prompt audio did not play. Retrying prompt...');
            await speakWithVoiceAssistant({
              text: prompt,
              language,
              volume: effectiveVolume,
              onStatus: setVoiceStatus,
              userInitiated: true,
              skipQuickStart: true
            });
          }

          setTimeout(startListening, 420);
          return;
        }

        if (audioGuidance && prompt) {
          speakAssistant(prompt, true);
          setTimeout(startListening, 850);
          return;
        }

        setTimeout(startListening, 60);
      };

      runCapture();
    },
    [
      audioGuidance,
      audioVolume,
      emitVoiceFieldFill,
      headphoneMode,
      language,
      showNotice,
      speakAssistant,
      voiceCommandSupported
    ]
  );

  const citizenNav = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Report Issue', to: '/services' },
    { label: 'Escalations', to: '/complaints' },
    { label: 'Evidence Upload', to: '/upload-documents' },
    { label: 'Support Payment', to: '/payment' },
    { label: 'Track Issues', to: '/status-tracking' }
  ];

  const adminNav = [
    { label: 'Resolution Hub', to: '/admin/dashboard' },
    { label: 'Issue Reports', to: '/admin/requests' },
    { label: 'Escalations', to: '/admin/complaints' },
    { label: 'Users', to: '/admin/users' },
    { label: 'Impact Dashboards', to: '/admin/reports' }
  ];

  const guestNav = [
    { label: 'Home', to: '/' },
    { label: 'Language', to: '/language' },
    { label: 'Guest Dashboard', to: '/dashboard' },
    { label: 'Community Login', to: '/login' },
    { label: 'Team Login', to: '/admin' }
  ];

  const navItems = user
    ? ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
      ? adminNav
      : citizenNav
    : guestNav;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const resetForNewUser = () => {
    stopVoiceAssistant();
    dispatch(logout());
    sessionStorage.clear();
    showNotice('Session reset for new user.');
    navigate('/', { replace: true });
    setTimeout(() => {
      window.location.reload();
    }, 120);
  };

  const restartIdleTimer = useCallback(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (autoResetRef.current) clearInterval(autoResetRef.current);
      setIsIdle(false);
      setCountdown(AUTO_RESET_SECONDS);

      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
        let remaining = AUTO_RESET_SECONDS;
        autoResetRef.current = setInterval(() => {
          remaining -= 1;
          setCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(autoResetRef.current);
            resetForNewUser();
          }
        }, 1000);
      }, IDLE_TIMEOUT_MS);
    }, [dispatch, navigate]);

  useEffect(() => {
    restartIdleTimer();
    const events = ['click', 'touchstart', 'mousemove', 'keydown'];
    const activityHandler = () => restartIdleTimer();

    events.forEach((eventName) => window.addEventListener(eventName, activityHandler));
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, activityHandler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (autoResetRef.current) clearInterval(autoResetRef.current);
    };
  }, [restartIdleTimer]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    document.body.classList.toggle('high-contrast', highContrast);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(themeMode === 'dark' ? 'theme-dark' : 'theme-light');
  }, [fontScale, highContrast, themeMode]);

  useEffect(() => {
    const outputSupported = isVoiceOutputSupported();
    const commandSupported = isVoiceCommandSupported();
    setVoiceSupported(outputSupported);
    setVoiceCommandSupported(commandSupported);
    if (!outputSupported) setVoiceStatus('unsupported');

    return () => {
      stopVoiceCommandListener();
    };
  }, []);

  useEffect(() => {
    if (!audioGuidance) return;

    if (suppressAutoGuideOnceRef.current) {
      suppressAutoGuideOnceRef.current = false;
      return;
    }

    const routeKey = `${location.pathname}|${location.key || ''}|${title || ''}|${language}`;
    if (lastAutoGuideKeyRef.current === routeKey) return;

    const timer = setTimeout(() => {
      lastAutoGuideKeyRef.current = routeKey;
      const heading = title || t('appTitle');
      const guide = getVoiceGuideText();
      const message = `${heading}. ${guide}`;
      speakAssistant(message).then((ok) => {
        pendingAutoGuideRef.current = ok ? '' : message;
      });
    }, 140);

    return () => {
      clearTimeout(timer);
    };
  }, [audioGuidance, getVoiceGuideText, language, location.key, location.pathname, speakAssistant, t, title]);

  useEffect(() => {
    const flow = pendingRouteVoiceFlowRef.current;
    if (!flow) return;
    if (flow.type !== 'login-name-flow') return;
    if (location.pathname !== '/login') return;

    const timer = setTimeout(() => {
      startVoiceFieldCapture({
        field: 'name',
        prompt:
          language === 'hi'
            ? 'कृपया अपना पूरा नाम बोलिए।'
            : 'Please say your full name after the beep. I will fill it in login form.',
        source: 'login-name-flow'
      });
      pendingRouteVoiceFlowRef.current = null;
    }, 260);

    return () => clearTimeout(timer);
  }, [language, location.pathname, startVoiceFieldCapture]);

  // Removed click/touch replay loop for pending auto-guide because it races with
  // user-initiated speech and can cause repeated self-interruptions.

  useEffect(() => {
    const onVoiceCaptureRequest = (event) => {
      const payload = event?.detail || {};
      if (!payload.field || typeof payload.field !== 'string') return;
      startVoiceFieldCapture({
        field: payload.field,
        prompt: payload.prompt,
        source: payload.source || 'voice'
      });
    };

    window.addEventListener('suvidha:voice-capture-request', onVoiceCaptureRequest);
    return () => {
      window.removeEventListener('suvidha:voice-capture-request', onVoiceCaptureRequest);
    };
  }, [startVoiceFieldCapture]);

  useEffect(() => {
    const syncQueueSize = async () => {
      const size = await getOfflineQueueSize();
      setQueueSize(size);
    };

    syncQueueSize();

    const onConnectivityChange = () => {
      setIsOnline(navigator.onLine);
      syncQueueSize();
    };

    window.addEventListener('online', onConnectivityChange);
    window.addEventListener('offline', onConnectivityChange);

    const interval = setInterval(() => {
      syncQueueSize();
    }, 5000);

    return () => {
      window.removeEventListener('online', onConnectivityChange);
      window.removeEventListener('offline', onConnectivityChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const kioskId = import.meta.env.VITE_KIOSK_ID;
    const kioskKey = import.meta.env.VITE_KIOSK_KEY;
    if (!kioskId || !kioskKey) return;

    const sendHeartbeat = async () => {
      try {
        await api.post(
          '/api/health/kiosk-heartbeat',
          {
            online: navigator.onLine,
            health: 'OK',
            appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0'
          },
          {
            headers: {
              'x-kiosk-id': kioskId,
              'x-kiosk-key': kioskKey
            }
          }
        );
      } catch (_error) {
        // no-op for local dev if device auth is not configured
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, []);

  const enterFullscreen = async () => {
    try {
      if (!document.documentElement.requestFullscreen) {
        showNotice('Fullscreen is not supported in this browser.');
        return;
      }

      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        showNotice('Fullscreen enabled.');
      } else {
        await document.exitFullscreen();
        showNotice('Fullscreen exited.');
      }
    } catch (_error) {
      showNotice('Unable to change fullscreen mode.');
    }
  };

  const toggleContrast = () => {
    const next = !highContrast;
    dispatch(setHighContrast(next));
    showNotice(next ? 'High contrast enabled.' : 'High contrast disabled.');
  };

  const enableAudioGuidance = useCallback(() => {
    if (!voiceSupported) {
      showNotice('Voice guidance is not supported in this browser.');
      return;
    }

    const restoredVolume = audioVolume > 0 ? audioVolume : 0.75;
    if (audioVolume <= 0) {
      dispatch(setAudioVolume(restoredVolume));
    }

    lastAutoGuideKeyRef.current = '';
    pendingAutoGuideRef.current = '';
    dispatch(setAudioGuidance(true));
    showNotice('Voice guidance enabled.');

    const heading = title || t('appTitle');
    const guide = getVoiceGuideTextForPath(location.pathname);
    const message = `${heading}. ${guide}`;
    speakWithVoiceAssistant({
      text: message,
      language,
      volume: Math.min(1, Math.max(0.35, headphoneMode ? restoredVolume + 0.1 : restoredVolume)),
      onStatus: setVoiceStatus,
      userInitiated: true,
      skipQuickStart: true
    }).then((ok) => {
      if (!ok) {
        pendingAutoGuideRef.current = message;
      }
    });
  }, [
    audioVolume,
    dispatch,
    getVoiceGuideTextForPath,
    headphoneMode,
    language,
    location.pathname,
    showNotice,
    t,
    title,
    voiceSupported
  ]);

  const disableAudioGuidance = useCallback(() => {
    lastAutoGuideKeyRef.current = '';
    pendingAutoGuideRef.current = '';
    stopVoiceAssistant();
    dispatch(setAudioGuidance(false));
    setVoiceStatus('idle');
    showNotice('Voice guidance disabled.');
  }, [dispatch, showNotice]);

  const flushOfflineQueue = async () => {
    try {
      await syncOfflineQueue();
      const size = await getOfflineQueueSize();
      setQueueSize(size);
    } catch (_error) {
      // ignored
    }
  };

  const applyVoiceCommand = useCallback(
    async (transcriptValue) => {
      const transcript = normalizeTranscript(transcriptValue);
      setLastVoiceCommand(transcript);

      const replyPack = getReplyPack(language);

      const goTo = (path, label) => {
        navigate(path);
        showNotice(`Opening ${label}.`);
      };

      if (!transcript) {
        showNotice('No voice command detected.');
        return;
      }

      if (/(hello|hi|hey|नमस्ते|नमस्कार|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|السلام)/.test(transcript)) {
        showNotice('Greeting detected.');
        if (audioGuidance) speakAssistant(replyPack.greeting, true);
        return;
      }

      if (/(how are you|कैसे हो|कैसे हैं|तू कसा आहेस|كيف حالك)/.test(transcript)) {
        showNotice('General conversation detected.');
        if (audioGuidance) speakAssistant(replyPack.howAreYou, true);
        return;
      }

      if (/(who are you|what is your name|तुम कौन हो|आप कौन हैं|तुम्हारा नाम|आपका नाम)/.test(transcript)) {
        showNotice('Assistant identity requested.');
        if (audioGuidance) speakAssistant(replyPack.whoAreYou, true);
        return;
      }

      if (/(thank you|thanks|शुक्रिया|धन्यवाद|thanks a lot)/.test(transcript)) {
        showNotice('Thanks command detected.');
        if (audioGuidance) speakAssistant(replyPack.thanks, true);
        return;
      }

      if (/(start new user|new user|reset session|नया यूजर)/.test(transcript)) return resetForNewUser();
      if (/(logout|log out|लॉगआउट)/.test(transcript)) return handleLogout();
      if (/(go dashboard|open dashboard|डैशबोर्ड)/.test(transcript)) return goTo('/dashboard', 'dashboard');
      if (/(go services|open services|service page|सेवा)/.test(transcript)) return goTo('/services', 'services');
      if (/(open complaints|go complaints|शिकायत)/.test(transcript)) return goTo('/complaints', 'complaints');
      if (/(open payment|go payment|भुगतान)/.test(transcript)) return goTo('/payment', 'payment');
      if (/(open tracking|status tracking|ट्रैकिंग)/.test(transcript)) return goTo('/status-tracking', 'tracking');
      if (/(open language|change language|भाषा)/.test(transcript)) return goTo('/language', 'language');
      if (/(open login|citizen login|login page|लॉगिन|लॉग इन पेज|लॉगिन पेज)/.test(transcript)) {
        pendingRouteVoiceFlowRef.current = { type: 'login-name-flow' };
        suppressAutoGuideOnceRef.current = true;
        goTo('/login', 'citizen login');
        return;
      }
      if (/(open admin|admin login|एडमिन)/.test(transcript)) return goTo('/admin', 'admin login');
      if (/(home page|go home|होम)/.test(transcript)) return goTo('/', 'home');

      const nameMatch = transcript.match(/(?:my name is|name is|मैं हूँ|मेरा नाम)\s*(.+)$/i);
      if (nameMatch?.[1]) {
        const spokenName = nameMatch[1].trim();
        if (spokenName) {
          emitVoiceFieldFill('name', spokenName, 'direct-name-command');
          showNotice('Name captured from voice command.');
          if (audioGuidance) {
            speakAssistant(
              language === 'hi'
                ? `ठीक है। आपका नाम ${spokenName} भर दिया गया है।`
                : `Okay. I have filled your name as ${spokenName}.`,
              true
            );
          }
          return;
        }
      }

      if (/(audio on|voice on|start voice|ऑडियो चालू)/.test(transcript)) return enableAudioGuidance();
      if (/(audio off|voice off|stop voice|ऑडियो बंद)/.test(transcript)) return disableAudioGuidance();
      if (/(repeat guide|speak again|फिर बोलो)/.test(transcript)) return speakFromUserAction();

      if (/(volume up|increase volume|louder|आवाज़ बढ़ाओ|volume high)/.test(transcript)) {
        const nextVolume = Math.min(1, Number((audioVolume + 0.1).toFixed(2)));
        dispatch(setAudioVolume(nextVolume));
        showNotice(`Volume set to ${Math.round(nextVolume * 100)}%.`);
        return;
      }
      if (/(volume down|decrease volume|lower volume|आवाज़ कम|volume low)/.test(transcript)) {
        const nextVolume = Math.max(0, Number((audioVolume - 0.1).toFixed(2)));
        dispatch(setAudioVolume(nextVolume));
        showNotice(`Volume set to ${Math.round(nextVolume * 100)}%.`);
        return;
      }
      if (/(mute|volume mute|silent|आवाज़ बंद)/.test(transcript)) {
        dispatch(setAudioVolume(0));
        showNotice('Volume muted.');
        return;
      }
      if (/(max volume|full volume|volume max|पूरी आवाज़)/.test(transcript)) {
        dispatch(setAudioVolume(1));
        showNotice('Volume set to maximum.');
        return;
      }

      if (/(high contrast on|contrast on|high contrast|कॉन्ट्रास्ट ऑन)/.test(transcript) && !highContrast)
        return toggleContrast();
      if (/(high contrast off|normal contrast|कॉन्ट्रास्ट ऑफ)/.test(transcript) && highContrast)
        return toggleContrast();

      if (/(font bigger|increase font|zoom in|बड़ा फ़ॉन्ट)/.test(transcript)) {
        dispatch(setFontScale(fontScale + 0.05));
        showNotice('Font size increased.');
        return;
      }
      if (/(font smaller|decrease font|zoom out|छोटा फ़ॉन्ट)/.test(transcript)) {
        dispatch(setFontScale(fontScale - 0.05));
        showNotice('Font size decreased.');
        return;
      }

      if (/(headphone mode|headphone on|headphone off|हेडफोन)/.test(transcript)) {
        dispatch(setHeadphoneMode(!headphoneMode));
        showNotice('Headphone mode toggled.');
        return;
      }

      if (/(sync now|sync queue|सिंक)/.test(transcript)) {
        await flushOfflineQueue();
        showNotice('Offline queue sync triggered.');
        return;
      }

      if (/(fullscreen|full screen|फुल स्क्रीन)/.test(transcript)) {
        await enterFullscreen();
        return;
      }

      if (/(voice commands|help commands|command help|वॉइस कमांड|help|मदद)/.test(transcript)) {
        speakAssistant(
          'Available commands are: go dashboard, go services, open complaints, open payment, open tracking, open language, start new user, high contrast on or off, audio on or off, volume up, volume down, mute, max volume, font bigger or smaller, sync now, and fullscreen.',
          true
        );
        return;
      }

      showNotice(`Unknown command: ${transcript}`);
      if (audioGuidance) {
        speakAssistant(replyPack.unknown, true);
      }
    },
    [
      audioGuidance,
      disableAudioGuidance,
      dispatch,
      emitVoiceFieldFill,
      enableAudioGuidance,
      enterFullscreen,
      flushOfflineQueue,
      fontScale,
      handleLogout,
      language,
      audioVolume,
      headphoneMode,
      highContrast,
      navigate,
      resetForNewUser,
      showNotice,
      speakAssistant,
      startVoiceFieldCapture,
      speakFromUserAction,
      toggleContrast
    ]
  );

  const startVoiceCommands = useCallback(() => {
    if (!voiceCommandSupported) {
      showNotice('Voice commands are not supported in this browser.');
      return;
    }

    if (isVoiceListening) {
      stopVoiceCommandListener();
      setIsVoiceListening(false);
      showNotice('Voice command listening stopped.');
      return;
    }

    const started = startVoiceCommandListener({
      language,
      onStatus: (status) => {
        setIsVoiceListening(status === 'listening');
      },
      onTranscript: (transcript) => {
        setIsVoiceListening(false);
        applyVoiceCommand(transcript);
      },
      onError: (message) => {
        setIsVoiceListening(false);
        showNotice(message || 'Voice command failed.');
      }
    });

    if (!started) {
      setIsVoiceListening(false);
      showNotice('Could not start voice command listener.');
      return;
    }

    showNotice('Listening for voice command...');
  }, [applyVoiceCommand, isVoiceListening, language, showNotice, voiceCommandSupported]);

  const toggleAudio = () => {
    const nextEnabled = !audioGuidance;
    if (nextEnabled) {
      enableAudioGuidance();
    } else {
      disableAudioGuidance();
    }
  };

  const toggleThemeMode = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    dispatch(setThemeMode(nextTheme));
    showNotice(`${nextTheme === 'dark' ? 'Dark' : 'Light'} theme enabled.`);
  };

  return (
    <div className="app-shell relative flex min-h-screen flex-col">
      <header className="app-header sticky top-0 z-20">
        <div className="app-brand-panel">
          <div className="app-header-bar">
            <div className="mx-auto flex max-w-7xl items-center justify-start gap-6 overflow-x-auto whitespace-nowrap px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              <span className="shrink-0">Community Hero • Hyperlocal Problem Solver</span>
              <span className="shrink-0">Transparent reporting, tracking, and accountability</span>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5">
            <div className="flex w-full min-w-[280px] flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-[300px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border-[3px] border-[var(--border)] bg-[var(--surface)] sm:w-[360px] md:w-[460px] lg:h-28 lg:w-[580px]">
                {!isHeaderLogoMissing && (
                  <img
                    src={headerLogoSrc}
                    alt="Community Hero Logo"
                    className="h-full w-full object-contain px-3 py-2"
                    onError={() => setIsHeaderLogoMissing(true)}
                  />
                )}
                {isHeaderLogoMissing && (
                  <div className="px-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text)]">
                    Add Logo
                  </div>
                )}
              </div>

                <div className="min-w-[190px]">
                  <p className="ui-hand-label mb-2 inline-block whitespace-nowrap">Hyperlocal Problem Solver</p>
                  <h1 className="text-2xl font-extrabold leading-tight md:text-4xl">{t('appTitle')}</h1>
                  {title && <p className="mt-2 text-sm text-[var(--text-inverse)] sm:whitespace-nowrap">{title}</p>}
                </div>
              </div>

              <div className="ui-card ui-grid-pattern w-full max-w-md p-4">
                <div className="relative z-10">
                  <p className="ui-label mb-3">Issue Snapshot</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="admin-shell-stat">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Mode</span>
                      <span className="text-sm font-extrabold">{user ? user.role : 'Guest'}</span>
                    </div>
                    <div className="admin-shell-stat">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Queue</span>
                      <span className="text-sm font-extrabold">{queueSize} pending</span>
                    </div>
                    <div className="admin-shell-stat">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">Voice</span>
                      <span className="text-sm font-extrabold">{voiceStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t-[3px] border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <span className={`ui-chip-button ${isOnline ? 'bg-[var(--surface-green)]' : 'bg-[var(--surface-red)]'}`}>
              {isOnline ? t('onlineMode') : t('offlineMode')}
            </span>
            <span className="ui-hand-label">Offline Queue: {queueSize}</span>
            {isOnline && queueSize > 0 && (
              <button className="touch-btn kiosk-primary-btn !w-auto px-3 py-1 text-sm" onClick={flushOfflineQueue}>
                Sync Now
              </button>
            )}
          </div>
        </div>
        <div className="border-t-[3px] border-[var(--border)] bg-[var(--surface-alt)]">
          <nav className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-4">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`touch-btn ui-action-link text-sm ${
                    active ? 'ui-tone-yellow' : 'bg-[var(--surface)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className={`mx-auto w-full max-w-7xl flex-1 px-4 py-8 ${isIdle ? 'blur-sm' : ''}`}>
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <aside className="side-panel side-panel-sticky p-4">
            <div className="space-y-4">
              <section className="side-panel-section space-y-3">
                <p className="ui-hand-label inline-block">display</p>
                <button className="touch-btn kiosk-primary-btn" onClick={toggleThemeMode}>
                  Switch to {themeMode === 'dark' ? 'Light' : 'Dark'} Theme
                </button>
                <LanguageToggle />
              </section>

              <section className="side-panel-section space-y-3">
                <p className="ui-hand-label inline-block">voice controls</p>
                <button className="touch-btn ui-chip-button w-full justify-center" onClick={toggleAudio} disabled={!voiceSupported}>
                  {audioGuidance ? t('audioOff') : t('audioGuidance')}
                </button>
                <button
                  className="touch-btn ui-chip-button w-full justify-center"
                  onClick={speakFromUserAction}
                  disabled={!voiceSupported || !audioGuidance}
                >
                  {t('repeatVoiceGuide')}
                </button>
                <button
                  className="touch-btn ui-chip-button w-full justify-center"
                  onClick={startVoiceCommands}
                  disabled={!voiceCommandSupported}
                >
                  {isVoiceListening ? 'Stop Voice Cmd' : 'Voice Command'}
                </button>
                <button
                  className="touch-btn ui-chip-button w-full justify-center"
                  onClick={() =>
                    speakAssistant(
                      'Voice commands available: go dashboard, go services, open complaints, open payment, open tracking, open language, open login, open admin, start new user, high contrast on, high contrast off, audio on, audio off, volume up, volume down, mute, max volume, font bigger, font smaller, sync now, and fullscreen.',
                      true
                    )
                  }
                  disabled={!voiceSupported}
                >
                  Voice Help
                </button>
                {audioGuidance && (
                  <div className="ui-card p-3">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <span>Volume</span>
                      <span>{Math.round(audioVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioVolume}
                      onChange={(e) => dispatch(setAudioVolume(Number(e.target.value)))}
                      className="side-panel-range h-2 cursor-pointer"
                      aria-label="Audio level"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="ui-chip-button justify-center px-3 py-2">Voice: {voiceStatus}</div>
                  <div className="ui-chip-button justify-center px-3 py-2">
                    Cmd: {voiceCommandSupported ? (isVoiceListening ? 'listening' : 'idle') : 'unsupported'}
                  </div>
                </div>
                {lastVoiceCommand && (
                  <div className="ui-note truncate px-3 py-2 text-xs" title={lastVoiceCommand}>
                    Heard: {lastVoiceCommand}
                  </div>
                )}
              </section>

              <section className="side-panel-section space-y-3">
                <p className="ui-hand-label inline-block">accessibility</p>
                <button className="touch-btn ui-chip-button w-full justify-center" onClick={toggleContrast}>
                  {highContrast ? 'Normal Contrast' : 'High Contrast'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="touch-btn ui-chip-button justify-center" onClick={() => dispatch(setFontScale(fontScale - 0.05))}>
                    A-
                  </button>
                  <button className="touch-btn ui-chip-button justify-center" onClick={() => dispatch(setFontScale(fontScale + 0.05))}>
                    A+
                  </button>
                </div>
                <button
                  className="touch-btn ui-chip-button w-full justify-center"
                  onClick={() => dispatch(setHeadphoneMode(!headphoneMode))}
                >
                  {headphoneMode ? t('headphoneOn') : t('headphoneMode')}
                </button>
              </section>

              <section className="side-panel-section side-panel-nav">
                <p className="ui-hand-label inline-block">session</p>
                <div className="ui-card p-3 text-sm font-semibold">
                  {user ? `${user.name || 'Resident'} (${user.role})` : 'Guest'}
                </div>
                <button className="touch-btn ui-chip-button w-full justify-center" onClick={enterFullscreen}>
                  Fullscreen
                </button>
                <button className="touch-btn ui-chip-button w-full justify-center" onClick={resetForNewUser}>
                  Start New User
                </button>
                {user && (
                  <button className="touch-btn ui-chip-button ui-chip-danger w-full justify-center" onClick={handleLogout}>
                    Logout
                  </button>
                )}
              </section>
            </div>
          </aside>

          <div>{children}</div>
        </div>
      </main>

      {uiNotice && (
        <div className="floating-notice fixed bottom-4 right-4 z-50 px-4 py-2 text-sm font-semibold">
          {uiNotice}
        </div>
      )}

      <footer className="app-footer mt-8 px-4 py-4 text-sm text-[var(--text-soft)]">
        <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-semibold text-[var(--text)]">Community Hero • Hyperlocal Problem Solver</p>
            <p>Neighborhood reporting, issue tracking, and resolution support</p>
          </div>
          <div className="break-all text-left md:text-right">
            <p>
              LinkedIn:{' '}
              <a
                className="font-semibold underline decoration-2 underline-offset-4"
                href="https://www.linkedin.com/in/amit"
                target="_blank"
                rel="noreferrer"
              >
                www.linkedin.com/in/amit
              </a>
            </p>
          </div>
        </div>
      </footer>

      {isIdle && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-5 text-center"
          onClick={restartIdleTimer}
        >
          <div className="idle-overlay-card max-w-lg p-6">
            <h2 className="text-2xl font-bold">Privacy Mode Enabled</h2>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Session will auto reset in {countdown}s for the next citizen. Tap anywhere to continue.
            </p>
          </div>
        </div>
      )}

      <OfflineAssistantWidget currentPath={location.pathname} />
    </div>
  );
}
