import { useId } from 'react';

interface ArthaLogoProps {
  size?: number;
  className?: string;
}

/**
 * Artha AI brand mark — a luminous spark inside a gradient tile.
 * Used for the assistant trigger, chat header, and intro previews.
 */
export function ArthaLogo({ size = 20, className = '' }: ArthaLogoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tileId = `artha-tile-${uid}`;
  const sparkId = `artha-spark-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Artha AI logo"
    >
      <defs>
        <linearGradient id={tileId} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2DD4BF" />
          <stop offset="0.55" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id={sparkId} x1="24" y1="10" x2="24" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>
      {/* Tile */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        fill={`url(#${tileId})`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      {/* Spark */}
      <path
        d="M24 12.5C25.7 18.4 29.6 22.3 35.5 24C29.6 25.7 25.7 29.6 24 35.5C22.3 29.6 18.4 25.7 12.5 24C18.4 22.3 22.3 18.4 24 12.5Z"
        fill={`url(#${sparkId})`}
      />
      {/* Orbiting dot */}
      <circle cx="35.5" cy="13.5" r="2.4" fill="#FDE68A" />
    </svg>
  );
}
