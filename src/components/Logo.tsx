import React, { useEffect, useRef, useState } from 'react';
import { loadMonogram, subscribeLogo } from '../lib/monogram3d';

interface LogoProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
}

// ---------------------------------------------------------------------------
// Logo — the real 3D "AD" monogram (assets/ad-monogram.obj), rendered by a
// hand-written software 3D pipeline shared across every instance on the
// page (see src/lib/monogram3d.ts). While the 72KB mesh loads, the classic
// SVG mark shows so the logo never flashes empty. Reduced-motion visitors
// get a static hero pose instead of the slow turn.
// ---------------------------------------------------------------------------

/** the previous hand-drawn mark, kept as the instant-loading fallback */
const ClassicMark: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 200 200"
    width="100%"
    height="100%"
    aria-hidden
  >
    <style>{`
      .logo-monogram-f {
        font-family: 'Bodoni Moda', 'Instrument Serif', Georgia, serif;
        font-size: 82px;
        fill: var(--color-text-primary, #ffffff);
        text-anchor: middle;
        font-weight: 600;
        letter-spacing: 1px;
      }
      .logo-orbit-f { fill: none; stroke: var(--color-stroke, rgba(255,255,255,0.15)); stroke-width: 0.75; }
      .logo-node-f { fill: var(--color-text-primary, #ffffff); }
    `}</style>
    <circle className="logo-orbit-f" cx="100" cy="100" r="85" />
    <circle className="logo-node-f" cx="185" cy="100" r="2.5" />
    <circle className="logo-node-f" cx="15" cy="100" r="2.5" />
    <circle className="logo-node-f" cx="100" cy="15" r="2.5" />
    <circle className="logo-node-f" cx="100" cy="185" r="2.5" />
    <text className="logo-monogram-f" x="100" y="128">AD</text>
  </svg>
);

export const Logo: React.FC<LogoProps> = ({ className = '', size = 40, animated = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    loadMonogram().then((m) => {
      if (!disposed && m) setReady(true);
    });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!ready || !canvas) return;
    let disposed = false;
    let unsub: (() => void) | undefined;
    subscribeLogo(canvas, animated).then((u) => {
      if (disposed) u();
      else unsub = u;
    });
    return () => {
      disposed = true;
      unsub?.();
    };
  }, [ready, animated]);

  const dim = typeof size === 'number' ? `${size}px` : size;
  return (
    <span
      className={`inline-block select-none ${className}`}
      style={{ width: dim, height: dim }}
      role="img"
      aria-label="Atharv Dhiman — 3D AD monogram"
    >
      {ready ? (
        <canvas
          ref={canvasRef}
          width={192}
          height={192}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      ) : (
        <ClassicMark />
      )}
    </span>
  );
};
