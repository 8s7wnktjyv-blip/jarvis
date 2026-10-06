/** Schlanke Inline-SVG-Icons (keine externe Icon-Bibliothek nötig). */
type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const SendIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export const StopIcon = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
);

export const MicIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const SpeakerIcon = ({ size = 20, muted }: IconProps & { muted?: boolean }) => (
  <svg {...base(size)}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    {muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
  </svg>
);

export const PlusIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ShareIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);
