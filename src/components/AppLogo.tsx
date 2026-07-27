interface AppLogoProps {
  size?: number;
  className?: string;
}

/** InkNote brand mark: ink drop + pen tip */
export function AppLogo({ size = 18, className = "" }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="inknote-logo-g" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7AA2F7" />
          <stop offset="0.55" stopColor="#5B8DEF" />
          <stop offset="1" stopColor="#3B6BC7" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="url(#inknote-logo-g)" />
      <path
        d="M10 21.5c2.2-1.1 3.6-3.2 4.1-5.6.3-1.4 1.1-2.5 2.3-3.1 1.5-.8 3.3-.4 4.3 1 .7 1 .7 2.4-.1 3.4-.9 1.1-2.4 1.5-3.7 1.1"
        stroke="#F4F7FF"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.2 9.2 22.8 7.4c.4-.15.8.2.65.6L21.6 12.5"
        stroke="#F4F7FF"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.2" cy="22.2" r="1.35" fill="#F4F7FF" opacity="0.95" />
    </svg>
  );
}
