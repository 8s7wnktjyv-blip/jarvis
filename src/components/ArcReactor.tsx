import { assistant } from "@/config/assistant";

export type ReactorState = "idle" | "listening" | "thinking" | "speaking";

/** Animierter „Kern“ von James – visualisiert den aktuellen Zustand. */
export function ArcReactor({ state = "idle", size = 160 }: { state?: ReactorState; size?: number }) {
  return (
    <div
      className={`reactor reactor--${state}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${assistant.name} Status: ${state}`}
    >
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="reactor-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="reactor__halo" cx="100" cy="100" r="96" />
        <g className="reactor__ring reactor__ring--outer">
          <circle cx="100" cy="100" r="86" pathLength="100" strokeDasharray="18 7" />
        </g>
        <g className="reactor__ring reactor__ring--mid">
          <circle cx="100" cy="100" r="68" pathLength="100" strokeDasharray="4 4" />
        </g>
        <g className="reactor__ring reactor__ring--inner">
          <circle cx="100" cy="100" r="50" pathLength="100" strokeDasharray="30 3 10 3" />
        </g>
        <circle className="reactor__core" cx="100" cy="100" r="34" fill="url(#reactor-core)" />
      </svg>
    </div>
  );
}
