import React, { useMemo, useState } from 'react';
import { computeRisk, formatINR } from '../lib/playground';
import type { RiskInput } from '../lib/playground';

const initial: RiskInput = {
  creditScore: 720,
  monthlyIncome: 90000,
  existingEmi: 6000,
  loanAmount: 600000,
  tenureMonths: 60,
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label className="min-w-0 text-sm text-muted">{label}</label>
        <span className="shrink-0 font-mono text-sm font-semibold text-text-primary">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-2"
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--stroke) ${pct}%)`,
        }}
      />
    </div>
  );
};

const ApprovalGauge: React.FC<{ value: number; color: string }> = ({
  value,
  color,
}) => {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-24 w-24 shrink-0 sm:h-32 sm:w-32">
      <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90 sm:h-32 sm:w-32">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--stroke)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl italic text-text-primary sm:text-3xl">
          {value.toFixed(0)}%
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted">
          approval
        </span>
      </div>
    </div>
  );
};

export const CreditRiskSimulator: React.FC = () => {
  const [input, setInput] = useState<RiskInput>(initial);
  const result = useMemo(() => computeRisk(input), [input]);

  const set = (key: keyof RiskInput) => (v: number) =>
    setInput((prev) => ({ ...prev, [key]: v }));

  const foirPct = result.foir * 100;
  const foirColor =
    result.foir <= 0.3 ? '#34d399' : result.foir <= 0.4 ? '#fbbf24' : '#f87171';

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Controls */}
      <div className="min-w-0 space-y-6">
        <Slider
          label="Credit score"
          value={input.creditScore}
          min={300}
          max={900}
          step={5}
          onChange={set('creditScore')}
          display={String(input.creditScore)}
        />
        <Slider
          label="Monthly income"
          value={input.monthlyIncome}
          min={15000}
          max={500000}
          step={5000}
          onChange={set('monthlyIncome')}
          display={formatINR(input.monthlyIncome)}
        />
        <Slider
          label="Existing EMIs / month"
          value={input.existingEmi}
          min={0}
          max={150000}
          step={1000}
          onChange={set('existingEmi')}
          display={formatINR(input.existingEmi)}
        />
        <Slider
          label="Requested loan amount"
          value={input.loanAmount}
          min={50000}
          max={5000000}
          step={25000}
          onChange={set('loanAmount')}
          display={formatINR(input.loanAmount)}
        />
        <Slider
          label="Tenure"
          value={input.tenureMonths}
          min={12}
          max={84}
          step={6}
          onChange={set('tenureMonths')}
          display={`${input.tenureMonths} mo`}
        />
      </div>

      {/* Result */}
      <div className="min-w-0 rounded-3xl border border-stroke bg-bg/40 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-left">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted">
              Risk tier
            </div>
            <div className="mt-2 flex items-center justify-center gap-3 sm:justify-start">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold"
                style={{
                  color: result.accent,
                  background: `${result.accent}1f`,
                  border: `1px solid ${result.accent}55`,
                }}
              >
                {result.tier}
              </span>
              <div className="min-w-0">
                <div className="text-base font-semibold text-text-primary">
                  {result.tierLabel}
                </div>
                <div className="text-xs" style={{ color: result.accent }}>
                  {result.decision}
                </div>
              </div>
            </div>
          </div>
          <ApprovalGauge value={result.approval} color={result.accent} />
        </div>

        {/* FOIR meter */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">FOIR (fixed-obligation to income)</span>
            <span
              className="font-mono font-semibold"
              style={{ color: foirColor }}
            >
              {foirPct.toFixed(0)}%
            </span>
          </div>
          <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-stroke">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(foirPct, 100)}%`,
                background: foirColor,
                transition: 'width 0.5s ease, background 0.4s ease',
              }}
            />
            {/* 30% guardrail marker */}
            <div
              className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-text-primary/70"
              style={{ left: '30%' }}
              title="30% guardrail"
            />
          </div>
          <div className="mt-1 text-right text-[10px] text-muted">
            ≤30% guardrail
          </div>
        </div>

        {/* Terms */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {[
            { label: 'Interest rate', value: `${result.interestRate}%` },
            { label: 'New EMI', value: formatINR(result.newEmi) },
            { label: 'Max eligible', value: formatINR(result.maxLoan) },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center justify-between gap-2 rounded-xl border border-stroke bg-surface px-3 py-2.5 sm:flex-col sm:justify-center sm:gap-1 sm:py-3 sm:text-center"
            >
              <div className="order-2 font-mono text-sm font-semibold text-text-primary sm:order-none">
                {t.value}
              </div>
              <div className="order-1 text-[10px] text-muted sm:order-none">
                {t.label}
              </div>
            </div>
          ))}
        </div>

        {/* Reasons */}
        <ul className="mt-5 space-y-2">
          {result.reasons.map((reason, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-text-primary/90"
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  reason.ok
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {reason.ok ? '✓' : '!'}
              </span>
              {reason.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
