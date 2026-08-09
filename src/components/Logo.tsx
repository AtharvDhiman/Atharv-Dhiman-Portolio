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
        <linearGradient id="logo-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.9 }} />
          <stop offset="100%" style={{ stopColor: '#3a3939', stopOpacity: 0.3 }} />
        </linearGradient>
        <style>{`
          @keyframes logoPulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.2); opacity: 1; }
          }
          @keyframes logoDataFlow {
            0% { stroke-dashoffset: 200; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes logoFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .logo-node {
            fill: #ffffff;
            filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.7));
            transform-origin: center;
          }
          .logo-connection {
            stroke: var(--color-muted, #71717a);
            stroke-opacity: 0.6;
            stroke-width: 1.25;
            fill: none;
            stroke-dasharray: 4 2;
            ${animated ? 'animation: logoDataFlow 10s linear infinite;' : ''}
          }
          .logo-monogram {
            font-family: 'Bodoni Moda', 'Instrument Serif', Georgia, serif;
            font-size: 58px;
            font-weight: 700;
            fill: var(--color-text-primary, #ffffff);
            text-anchor: middle;
            dominant-baseline: middle;
            ${animated ? 'animation: logoFloat 4s ease-in-out infinite;' : ''}
          }
          .logo-orbit {
            stroke: var(--color-stroke, rgba(255, 255, 255, 0.15));
            stroke-width: 0.75;
            fill: none;
          }
        `}</style>
      </defs>

      {/* Background Orbital Structure */}
      <circle className="logo-orbit" cx="100" cy="100" r="80" />
      <circle className="logo-orbit" cx="100" cy="100" r="60" />

      {/* Neural Network Connections */}
      <path className="logo-connection" d="M60,60 L100,40 L140,60 L140,140 L100,160 L60,140 Z" />
      <line className="logo-connection" x1="100" y1="40" x2="100" y2="160" />
      <line className="logo-connection" x1="60" y1="60" x2="140" y2="140" />
      <line className="logo-connection" x1="140" y1="60" x2="60" y2="140" />

      {/* Neural Nodes with Staggered Pulse */}
      <circle className="logo-node" cx="100" cy="40" r="3.5" style={animated ? { animation: 'logoPulse 2s infinite' } : {}} />
      <circle className="logo-node" cx="140" cy="60" r="3.5" style={animated ? { animation: 'logoPulse 2s infinite 0.3s' } : {}} />
      <circle className="logo-node" cx="140" cy="140" r="3.5" style={animated ? { animation: 'logoPulse 2s infinite 0.6s' } : {}} />
      <circle className="logo-node" cx="100" cy="160" r="3.5" style={animated ? { animation: 'logoPulse 2s infinite 0.9s' } : {}} />
      <circle className="logo-node" cx="60" cy="140" r="3.5" style={animated ? { animation: 'logoPulse 2s infinite 1.2s' } : {}} />
      <circle className="logo-node" cx="60" cy="60" r="3.5" style={animated ? { animation: 'logoPulse 2s infinite 1.5s' } : {}} />

      {/* Central Monogram */}
      <text className="logo-monogram" x="100" y="105">
        AD
      </text>
    </svg>
  );
};
