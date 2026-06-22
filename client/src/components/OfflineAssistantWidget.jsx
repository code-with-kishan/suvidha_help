import { useMemo, useState } from 'react';
import OnScreenKeyboard from './OnScreenKeyboard';
import { getOfflineAssistantReply, offlineAssistantQuickPrompts } from '../data/offlineAssistantKnowledge';

const createAssistantMessage = (text) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role: 'assistant',
  text
});

const createUserMessage = (text) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role: 'user',
  text
});

export default function OfflineAssistantWidget({ currentPath = '/' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [
    createAssistantMessage(
      'Hello 👧 I am Suvidha. I work offline and can guide you with strict steps for every form. Ask me anything.'
    )
  ]);

  const canSend = useMemo(() => Boolean(input.trim()), [input]);

  const submitQuery = (query) => {
    const clean = String(query || '').trim();
    if (!clean) return;

    const reply = getOfflineAssistantReply({ query: clean, currentPath });
    setMessages((prev) => [...prev, createUserMessage(clean), createAssistantMessage(reply)]);
    setInput('');
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="offline-widget-shell pointer-events-auto mb-3 w-[22rem] max-w-[92vw]">
          <div className="flex items-center justify-between border-b-[3px] border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-[var(--text-inverse)]">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--surface)] text-base">👧</div>
              <div>
                <p className="text-sm font-bold">Suvidha</p>
                <p className="ui-hand-label mt-1 text-[11px]">Offline AI Helper</p>
              </div>
            </div>
            <button
              type="button"
              className="touch-btn ui-chip-button px-2 py-1 text-xs"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto bg-[var(--surface-alt)] p-3">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`rounded-[8px] border-[3px] border-[var(--border)] px-3 py-2 text-sm shadow-[4px_4px_0_0_var(--border)] ${
                  item.role === 'assistant'
                    ? 'bg-[var(--surface)] text-[var(--text)]'
                    : 'bg-[var(--surface-blue)] text-[var(--text)]'
                }`}
              >
                <p className="whitespace-pre-line">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t-[3px] border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex flex-wrap gap-2">
              {offlineAssistantQuickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="touch-btn ui-chip-button px-2 py-1 text-xs"
                  onClick={() => submitQuery(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              className="w-full text-sm"
              placeholder="Ask your question..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="touch-btn ui-chip-button px-3 py-2 text-xs"
                onClick={() => setShowKeyboard((value) => !value)}
              >
                {showKeyboard ? 'Hide Keyboard' : 'Toggle Keyboard'}
              </button>
              <button
                type="button"
                className="touch-btn kiosk-primary-btn !w-auto px-3 py-2 text-xs disabled:opacity-50"
                onClick={() => submitQuery(input)}
                disabled={!canSend}
              >
                Send
              </button>
            </div>

            {showKeyboard && (
              <OnScreenKeyboard
                value={input}
                onChange={setInput}
                maxLength={220}
                language={localStorage.getItem('suvidha_lang') || 'en'}
                mode="text"
                onClose={() => setShowKeyboard(false)}
              />
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className="offline-widget-fab pointer-events-auto touch-btn flex h-16 w-16 items-center justify-center text-2xl transition hover:-translate-y-0.5"
        onClick={() => setIsOpen((value) => !value)}
        title="Open Suvidha"
      >
        👧
      </button>
    </div>
  );
}
