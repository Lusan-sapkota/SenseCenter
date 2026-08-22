interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="SenseCenter"
    >
      <defs>
        <linearGradient id="sc-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand-teal)" />
          <stop offset="100%" stopColor="var(--brand-violet)" />
        </linearGradient>
      </defs>
      <polygon
        points="50,12 82.9,31 82.9,69 50,88 17.1,69 17.1,31"
        fill="none"
        stroke="url(#sc-logo-grad)"
        strokeWidth={5.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M26,50 L36,50 L42,29 L48,69 L54,41 L60,50 L74,50"
        fill="none"
        stroke="url(#sc-logo-grad)"
        strokeWidth={5.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontFamily: "var(--font-heading)" }}>
      <span>Sense</span>
      <span
        style={{
          background: "linear-gradient(100deg, var(--brand-teal), var(--brand-violet))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Center
      </span>
    </span>
  );
}
