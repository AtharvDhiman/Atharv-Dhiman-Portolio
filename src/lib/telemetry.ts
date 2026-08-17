// ---------------------------------------------------------------------------
// telemetry — in-page pub/store for "mechanism 03: the control room".
// The other two mechanisms publish their REAL runtime metrics and events
// here; ModelObservatory polls and displays them. Module-local, zero
// network, zero storage — monitoring, not tracking.
// ---------------------------------------------------------------------------

export interface BoundaryMetrics {
  epoch: number;
  loss: number;
  acc: number; // holdout accuracy 0-1
  frozen: boolean;
  n: number;
  fps: number; // EMA of the sim's real tick rate
  drift: number; // mean cluster-mean distance from OU anchors (normalized units)
}

export interface UnderwriterMetrics {
  p: number; // current engagement probability
  rescores: number; // how many times this visit has been re-scored
  fitMs: number;
}

export type EventLevel = 'info' | 'warn' | 'alert';

export interface TelemetryEvent {
  t: number; // performance.now() at emit
  msg: string;
  level: EventLevel;
}

interface Store {
  boundary: BoundaryMetrics | null;
  underwriter: UnderwriterMetrics | null;
  events: TelemetryEvent[];
}

const store: Store = { boundary: null, underwriter: null, events: [] };
const MAX_EVENTS = 24;

export const telemetry = {
  publishBoundary(m: BoundaryMetrics) {
    store.boundary = m;
  },
  publishUnderwriter(m: UnderwriterMetrics) {
    store.underwriter = m;
  },
  event(msg: string, level: EventLevel = 'info') {
    // dedup: skip if identical to the most recent message
    if (store.events[0]?.msg === msg) return;
    store.events.unshift({ t: performance.now(), msg, level });
    if (store.events.length > MAX_EVENTS) store.events.pop();
  },
  read(): Readonly<Store> {
    return store;
  },
};
