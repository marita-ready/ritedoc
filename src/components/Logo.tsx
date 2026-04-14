interface LogoProps {
  size?: number;
}

/**
 * RiteDoc app icon — "R" lettermark in a blue rounded square.
 * Used in the sidebar header, onboarding screens, and loading screen.
 */
export default function Logo({ size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="RiteDoc"
      role="img"
    >
      {/* Background — rounded square */}
      <rect width="40" height="40" rx="10" fill="#2563EB" />

      {/* Subtle inner highlight */}
      <rect
        x="1"
        y="1"
        width="38"
        height="19"
        rx="9"
        fill="white"
        fillOpacity="0.07"
      />

      {/* "R" lettermark */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="white"
        letterSpacing="-0.5"
      >
        R
      </text>
    </svg>
  );
}
