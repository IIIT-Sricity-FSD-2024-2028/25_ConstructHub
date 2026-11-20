import { HardHat } from 'lucide-react';

export function ConstructHubMark({ size = 34, variant = 'dark' }) {
  const isLight = variant === 'light';
  const iconSize = Math.round(size * 0.58);

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: isLight ? 'rgba(249, 115, 22, 0.16)' : '#fff7ed',
        border: isLight ? '1px solid rgba(249, 115, 22, 0.35)' : '1px solid #fed7aa',
        color: '#ea580c',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <HardHat size={iconSize} strokeWidth={2.1} />
    </span>
  );
}

export default function ConstructHubLogo({
  size = 34,
  textSize = 18,
  variant = 'dark',
  stacked = false,
  showText = true,
}) {
  const textColor = variant === 'light' ? '#ffffff' : '#0f172a';

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        gap: stacked ? 12 : 10,
        lineHeight: 1,
      }}
    >
      <ConstructHubMark size={size} variant={variant} />
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            fontSize: textSize,
            letterSpacing: '-0.03em',
            color: textColor,
            lineHeight: 1,
          }}
        >
          Construct<span style={{ color: '#ea580c' }}>Hub</span>
        </span>
      )}
    </span>
  );
}
