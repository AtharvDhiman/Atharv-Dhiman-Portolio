import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  animated?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 40,
  animated = true,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`select-none ${className}`}
      aria-label="Atharv Dhiman Logo"
    >
      <defs>
        <radialGradient id="logo-bg-grad">
          <stop offset="0%" stopColor="var(--color-text-primary, #ffffff)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <style>{`
          @keyframes logoPulseCore {
            0%, 100% { transform: scale(1); opacity: 0.8; filter: drop-shadow(0 0 5px rgba(255,255,255,0.5)); }
            50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0 0 15px rgba(255,255,255,0.9)); }
          }
          @keyframes logoRotateOuter {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes logoRotateInner {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes logoDashFlow {
            0% { stroke-dashoffset: 40; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes logoNodeBlink {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          .logo-monogram {
            font-family: 'Bodoni Moda', 'Instrument Serif', Georgia, serif;
            font-size: 52px;
            fill: var(--color-text-primary, #ffffff);
            text-anchor: middle;
            font-weight: 300;
          }
          .logo-orbit {
            fill: none;
            stroke: var(--color-stroke, rgba(255,255,255,0.15));
            stroke-width: 0.75;
          }
          .logo-connection {
            fill: none;
            stroke: var(--color-muted, rgba(255,255,255,0.4));
            stroke-width: 1;
            stroke-dasharray: 4 4;
            ${animated ? 'animation: logoDashFlow 3s linear infinite;' : ''}
          }
          .logo-node {
            fill: var(--color-text-primary, #ffffff);
          }
          .logo-center-group {
            transform-origin: 100px 100px;
            ${animated ? 'animation: logoPulseCore 4s ease-in-out infinite;' : ''}
          }
          .logo-outer-ring {
            transform-origin: 100px 100px;
            ${animated ? 'animation: logoRotateOuter 20s linear infinite;' : ''}
          }
          .logo-inner-ring {
            transform-origin: 100px 100px;
            ${animated ? 'animation: logoRotateInner 15s linear infinite;' : ''}
          }
        `}</style>
      </defs>

      {/* Background Glow */}
      <circle cx="100" cy="100" r="70" fill="url(#logo-bg-grad)" opacity="0.12" />

      {/* Outer Neural Ring */}
      <g className="logo-outer-ring">
        <circle className="logo-orbit" cx="100" cy="100" r="85" />
        <circle className="logo-node" cx="185" cy="100" r="2.5" />
        <circle className="logo-node" cx="15" cy="100" r="2.5" />
        <circle className="logo-node" cx="100" cy="15" r="2.5" />
        <circle className="logo-node" cx="100" cy="185" r="2.5" />
      </g>

      {/* Inner Connection Grid */}
      <g className="logo-inner-ring">
        <path className="logo-connection" d="M60,60 L140,60 L140,140 L60,140 Z" />
        <path className="logo-connection" d="M100,40 L160,100 L100,160 L40,100 Z" />
        <circle className="logo-node" cx="60" cy="60" r="3" style={animated ? { animation: 'logoNodeBlink 2s infinite' } : {}} />
        <circle className="logo-node" cx="140" cy="60" r="3" style={animated ? { animation: 'logoNodeBlink 2s infinite 0.5s' } : {}} />
        <circle className="logo-node" cx="140" cy="140" r="3" style={animated ? { animation: 'logoNodeBlink 2s infinite 1s' } : {}} />
        <circle className="logo-node" cx="60" cy="140" r="3" style={animated ? { animation: 'logoNodeBlink 2s infinite 1.5s' } : {}} />
      </g>

      {/* Central Monogram with Pulse */}
      <g className="logo-center-group">
        <text className="logo-monogram" x="100" y="118">
          AD
        </text>
      </g>
    </svg>
  );
};
