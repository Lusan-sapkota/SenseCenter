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
          <stop offset="0%" stopColor="#00E5BE" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#8065FF" />
        </linearGradient>
      </defs>
      <polygon
        points="50,12 82.9,31 82.9,69 50,88 17.1,69 17.1,31"
        fill="none"
        stroke="url(#sc-logo-grad)"
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M26,50 L36,50 L42,29 L48,69 L54,41 L60,50 L74,50"
        fill="none"
        stroke="url(#sc-logo-grad)"
        strokeWidth={6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ fontFamily: "var(--font-heading)" }}>
      <span className="font-bold tracking-tight text-white">Sense</span>
      <span
        className="font-bold tracking-tight"
        style={{
          background: "linear-gradient(135deg, #00E5BE 0%, #38BDF8 50%, #8065FF 100%)",
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
