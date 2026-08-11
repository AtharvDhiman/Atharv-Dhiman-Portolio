import React, { useEffect, useState } from 'react';
import { askData, suggestedQuestions } from '../lib/playground';
import type { AssistantAnswer } from '../lib/playground';

function useTypewriter(text: string, speed = 16) {
  const [out, setOut] = useState('');
  useEffect(() => {
    setOut('');
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return out;
}

const Bars: React.FC<{ bars: NonNullable<AssistantAnswer['bars']> }> = ({
  bars,
}) => {
  const max = Math.max(...bars.map((b) => b.value));
  return (
    <div className="mt-4 space-y-2.5">
      {bars.map((b, i) => (
        <div key={b.label} className="flex items-center gap-3">
          <div className="w-32 shrink-0 text-right text-xs text-muted">
            {b.label}
          </div>
          <div className="h-5 flex-1 overflow-hidden rounded bg-stroke">
            <div
              className="accent-gradient flex h-full items-center justify-end rounded pr-2 text-[10px] font-semibold text-bg"
              style={{
                width: `${(b.value / max) * 100}%`,
                transition: 'width 0.6s ease',
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {b.value}
              {b.suffix ?? ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SparkIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.2 11l2.5 1-2.5 1L12 15.5 10.8 13l-2.5-1 2.5-1L12 8.5Z" />
  </svg>
);

export const DataAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [asked, setAsked] = useState<string>(
    'What are the top attrition drivers?'
  );
  const [answer, setAnswer] = useState<AssistantAnswer>(() =>
    askData('What are the top attrition drivers?')
  );
  const detail = useTypewriter(answer.detail);

  const run = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAsked(trimmed);
    setAnswer(askData(trimmed));
    setQuery('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Suggestions */}
      <div className="lg:col-span-2">
        <p className="text-xs uppercase tracking-widest text-muted">Try asking</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedQuestions.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors ${
                asked === s
                  ? 'border-accent bg-accent/10 text-text-primary'
                  : 'border-stroke bg-surface text-muted hover:border-accent/50 hover:text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Simulated NL assistant — runs entirely in your browser over RetainAI's
          aggregate stats, no external API. Mirrors the in-app chatbot that lets
          non-technical HR staff query the model.
        </p>
      </div>

      {/* Chat panel */}
      <div className="lg:col-span-3">
        <div className="rounded-3xl border border-stroke bg-bg/40 p-5">
          {/* User bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm text-text-primary">
              {asked}
            </div>
          </div>

          {/* Assistant bubble */}
          <div className="mt-4 flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
              <SparkIcon />
            </div>
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-stroke bg-surface px-4 py-3">
              <p className="font-display text-lg italic text-text-primary">
                {answer.headline}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-text-primary/80">
                {detail}
                {detail.length < answer.detail.length && (
                  <span className="ml-0.5 -mb-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
                )}
              </p>
              {answer.bars && <Bars bars={answer.bars} />}
            </div>
          </div>
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(query);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about the attrition data…"
            className="flex-1 rounded-full border border-stroke bg-surface px-4 py-2.5 text-sm text-text-primary outline-none transition-colors placeholder:text-muted focus:border-accent/50"
          />
          <button
            type="submit"
            aria-label="Send"
            className="accent-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-bg transition-transform hover:scale-105"
          >
            <span className="text-lg">↑</span>
          </button>
        </form>
      </div>
    </div>
  );
};
