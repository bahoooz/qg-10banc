type ClipProgressOverlayProps = {
  progress: number;
  phase: string;
  title?: string;
  className?: string;
};

export default function ClipProgressOverlay({
  progress,
  phase,
  title = "Encodage en cours",
  className = "",
}: ClipProgressOverlayProps) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (safeProgress / 100) * ringCircumference;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80 px-6 text-center backdrop-blur-sm ${className}`}
    >
      <div className="relative size-36">
        <svg
          className="size-full -rotate-90"
          viewBox="0 0 128 128"
          aria-hidden="true"
        >
          <circle
            cx="64"
            cy="64"
            r={ringRadius}
            fill="none"
            stroke="rgba(205,183,255,0.15)"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={ringRadius}
            fill="none"
            stroke="rgb(205,183,255)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
            className="transition-[stroke-dashoffset] duration-300 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums text-main-color">
            {safeProgress}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-extrabold uppercase tracking-wide text-main-color">
          {title}
        </p>
        <p className="text-xs text-white/45">{phase}</p>
      </div>

      <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-secondary-color/40">
        <div
          className="h-full rounded-full bg-main-color transition-[width] duration-300 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}
