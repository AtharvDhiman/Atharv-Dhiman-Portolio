// -----------------------------------------------------------------------------
// Logic for the interactive Playground tools. Pure, client-side, no backend.
//   1. FinRisk credit-risk scoring model (heuristic, inspired by the real project)
//   2. RetainAI "ask the data" natural-language query engine over aggregate stats
// -----------------------------------------------------------------------------

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

export const formatINR = (v: number) =>
  '₹' + Math.round(v).toLocaleString('en-IN');

// -----------------------------------------------------------------------------
// 1. Credit-risk simulator
// -----------------------------------------------------------------------------
export type RiskTier = 'P1' | 'P2' | 'P3' | 'P4';

export interface RiskInput {
  creditScore: number; // 300 - 900
  monthlyIncome: number;
  existingEmi: number;
  loanAmount: number;
  tenureMonths: number;
}

export interface RiskResult {
  tier: RiskTier;
  tierLabel: string;
  decision: string;
  accent: string;
  approval: number; // 0 - 100
  foir: number; // 0 - 1
  creditHealth: number; // 0 - 100
  newEmi: number;
  interestRate: number;
  maxLoan: number;
  reasons: { ok: boolean; text: string }[];
}

// EMI for principal P at annual rate% over n months
function emi(P: number, annualRatePct: number, n: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return (P * r * f) / (f - 1);
}

// Inverse: largest principal affordable for a given monthly EMI budget
function principalFromEmi(emiBudget: number, annualRatePct: number, n: number) {
  const r = annualRatePct / 100 / 12;
  if (emiBudget <= 0) return 0;
  if (r === 0) return emiBudget * n;
  const f = Math.pow(1 + r, n);
  return (emiBudget * (f - 1)) / (r * f);
}

const TIER_META: Record<
  RiskTier,
  { label: string; rate: number; accent: string; decision: string }
> = {
  P1: { label: 'Prime', rate: 9.5, accent: '#34d399', decision: 'Auto-approve' },
  P2: {
    label: 'Near-prime',
    rate: 11.5,
    accent: '#38bdf8',
    decision: 'Approve',
  },
  P3: {
    label: 'Sub-prime',
    rate: 14.5,
    accent: '#fbbf24',
    decision: 'Approve with conditions',
  },
  P4: {
    label: 'High risk',
    rate: 18.5,
    accent: '#f87171',
    decision: 'Manual review / likely decline',
  },
};

// Decision boundary observed in the real BEL analysis
const BOUNDARY = 655;

export function computeRisk(input: RiskInput): RiskResult {
  const { creditScore, monthlyIncome, existingEmi, loanAmount, tenureMonths } =
    input;

  // Provisional EMI (nominal 13%) to estimate FOIR before the tier rate is known
  const provisionalEmi = emi(loanAmount, 13, tenureMonths);
  const foirProvisional =
    monthlyIncome > 0 ? (existingEmi + provisionalEmi) / monthlyIncome : 1;

  // Tier assignment — credit history first, FOIR guardrail second
  let tier: RiskTier;
  if (creditScore < 600 || foirProvisional > 0.5) {
    tier = 'P4';
  } else if (creditScore >= 760 && foirProvisional <= 0.3) {
    tier = 'P1';
  } else if (creditScore >= 690 && foirProvisional <= 0.35) {
    tier = 'P2';
  } else if (creditScore >= 645 && foirProvisional <= 0.42) {
    tier = 'P3';
  } else {
    tier = 'P4';
  }

  const meta = TIER_META[tier];
  const newEmi = emi(loanAmount, meta.rate, tenureMonths);
  const foir = monthlyIncome > 0 ? (existingEmi + newEmi) / monthlyIncome : 1;

  const decision =
    foir > 0.5 ? 'Decline — FOIR guardrail breached' : meta.decision;

  // Approval likelihood — logistic centered on the 655 boundary + FOIR penalty
  const z = (creditScore - BOUNDARY) / 38 - Math.max(0, foir - 0.3) * 7;
  const approval = clamp(100 / (1 + Math.exp(-z)), 2, 99);

  // Credit Health Score — 70% credit history, 30% FOIR headroom
  const scoreNorm = clamp((creditScore - 300) / 600, 0, 1);
  const headroom = clamp((0.5 - foir) / 0.5, 0, 1);
  const creditHealth = Math.round((scoreNorm * 0.7 + headroom * 0.3) * 100);

  // Max loan keeping total FOIR <= 40%
  const emiBudget = Math.max(0, monthlyIncome * 0.4 - existingEmi);
  const maxLoan = principalFromEmi(emiBudget, meta.rate, tenureMonths);

  const reasons: { ok: boolean; text: string }[] = [
    {
      ok: creditScore >= BOUNDARY,
      text:
        creditScore >= BOUNDARY
          ? `Credit score ${creditScore} is above the 650–660 approval boundary`
          : `Credit score ${creditScore} sits below the 650–660 boundary`,
    },
    {
      ok: foir <= 0.3,
      text:
        foir <= 0.3
          ? `FOIR ${(foir * 100).toFixed(0)}% is within the ≤30% guardrail`
          : `FOIR ${(foir * 100).toFixed(0)}% exceeds the ≤30% guardrail`,
    },
    {
      ok: creditHealth >= 60,
      text: `Credit Health Score of ${creditHealth}/100`,
    },
  ];

  return {
    tier,
    tierLabel: meta.label,
    decision,
    accent: meta.accent,
    approval,
    foir,
    creditHealth,
    newEmi,
    interestRate: meta.rate,
    maxLoan,
    reasons,
  };
}

// -----------------------------------------------------------------------------
// 2. RetainAI "ask the data" engine (aggregate HR-attrition knowledge base)
// -----------------------------------------------------------------------------
export interface AssistantAnswer {
  headline: string;
  detail: string;
  bars?: { label: string; value: number; suffix?: string }[];
}

const KB = {
  totalEmployees: 1470,
  attritionRate: 16.1,
  highRisk: 237,
  accuracy: 91.6,
  drivers: [
    { label: 'Overtime', value: 28 },
    { label: 'Monthly income', value: 19 },
    { label: 'Commute distance', value: 14 },
    { label: 'Years at company', value: 12 },
    { label: 'Job satisfaction', value: 11 },
  ],
  byDept: [
    { label: 'Sales', value: 20.6 },
    { label: 'Human Resources', value: 19.0 },
    { label: 'R&D', value: 13.8 },
  ],
  overtime: [
    { label: 'Works overtime', value: 30.5 },
    { label: 'No overtime', value: 10.4 },
  ],
};

export const suggestedQuestions = [
  'What are the top attrition drivers?',
  'How many employees are high flight-risk?',
  'Which department has the highest attrition?',
  'Does overtime affect attrition?',
  'How accurate is the model?',
];

export function askData(raw: string): AssistantAnswer {
  const q = raw.toLowerCase();

  const has = (...keys: string[]) => keys.some((k) => q.includes(k));

  // Order matters — most specific intents first so broad words
  // (e.g. "high" inside "highest") can't hijack another question.

  if (has('department', 'dept', 'division', 'team')) {
    return {
      headline: 'Sales has the highest attrition (20.6%)',
      detail:
        'Attrition rate broken down by department — Sales leads, with R&D the most stable.',
      bars: KB.byDept.map((d) => ({ ...d, suffix: '%' })),
    };
  }

  if (has('overtime', 'over time', 'extra hours')) {
    return {
      headline: 'Overtime nearly triples attrition risk',
      detail:
        "Employees working overtime leave at 30.5% vs 10.4% for those who don't — the single largest behavioural signal.",
      bars: KB.overtime.map((d) => ({ ...d, suffix: '%' })),
    };
  }

  if (has('accurate', 'accuracy', 'how good', 'perform')) {
    return {
      headline: `${KB.accuracy}% model accuracy`,
      detail:
        'RetainAI compares Logistic Regression, Random Forest and Gradient Boosting; the best model reaches 91.6% accuracy on serverless inference.',
    };
  }

  if (
    has('driver', 'factor', 'cause', 'reason', 'drives', 'important', 'predict')
  ) {
    return {
      headline: 'Overtime is the #1 driver of attrition',
      detail:
        'Feature-importance from the Gradient Boosting model ranks the strongest predictors of employee flight risk (relative importance %).',
      bars: KB.drivers.map((d) => ({ ...d, suffix: '%' })),
    };
  }

  if (has('how many', 'count', 'number', 'flight', 'high-risk', 'high risk')) {
    return {
      headline: `${KB.highRisk} employees flagged high flight-risk`,
      detail: `Out of ${KB.totalEmployees.toLocaleString(
        'en-US'
      )} employees, ${KB.highRisk} (${KB.attritionRate}%) score above the flight-risk threshold and are surfaced for HR review.`,
    };
  }

  if (has('rate', 'percentage', 'overall', 'total')) {
    return {
      headline: `${KB.attritionRate}% overall attrition rate`,
      detail: `${KB.highRisk} of ${KB.totalEmployees.toLocaleString(
        'en-US'
      )} employees left or are predicted to leave.`,
    };
  }

  return {
    headline: 'I can answer questions about the attrition data',
    detail:
      'Try asking about attrition drivers, high-risk headcount, attrition by department, the overtime effect, or model accuracy. Tap a suggestion below to start.',
  };
}
