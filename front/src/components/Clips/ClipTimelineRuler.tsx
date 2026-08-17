import {
  buildTimelineSubTickTimes,
  buildTimelineTickTimes,
  formatTimelineRulerLabel,
  getTimelineTickInterval,
} from "../../lib/clipTimelineRuler";

type ClipTimelineRulerProps = {
  duration: number;
};

export default function ClipTimelineRuler({ duration }: ClipTimelineRulerProps) {
  if (duration <= 0) return null;

  const interval = getTimelineTickInterval(duration);
  const ticks = buildTimelineTickTimes(duration, interval);
  const subTicks = buildTimelineSubTickTimes(duration, interval, ticks);

  return (
    <div
      className="relative mb-1 h-4 select-none"
      aria-hidden="true"
    >
      {subTicks.map((time) => {
        const left = (time / duration) * 100;

        return (
          <div
            key={`sub-${time.toFixed(3)}`}
            className="pointer-events-none absolute bottom-0 -translate-x-1/2"
            style={{ left: `${left}%` }}
          >
            <div className="mx-auto h-1.5 w-px bg-white/18" />
          </div>
        );
      })}

      {ticks.map((time) => {
        const left = (time / duration) * 100;
        const isStart = time === 0;
        const isEnd = Math.abs(time - duration) < 0.01;

        return (
          <div
            key={`tick-${time.toFixed(3)}`}
            className="pointer-events-none absolute bottom-0 -translate-x-1/2"
            style={{ left: `${left}%` }}
          >
            <div className="mx-auto h-1.5 w-px bg-white/12" />
            {!isEnd && (
              <span
                className={`mt-0.5 block whitespace-nowrap text-[8px] tabular-nums tracking-wide text-white/20 ${
                  isStart ? "translate-x-[35%]" : ""
                }`}
              >
                {formatTimelineRulerLabel(time)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
