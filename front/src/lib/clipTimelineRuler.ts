import { formatClipTime } from "./clipTime";

const NICE_INTERVALS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600] as const;

/** Intervalle entre deux repères majeurs (~8–12 labels visibles). */
export function getTimelineTickInterval(duration: number): number {
  if (duration <= 0) return 1;

  const targetTickCount = 10;
  const raw = duration / targetTickCount;

  for (const step of NICE_INTERVALS) {
    if (raw <= step) return step;
  }

  return 600;
}

export function buildTimelineTickTimes(
  duration: number,
  interval: number,
): number[] {
  if (duration <= 0 || interval <= 0) return [0];

  const ticks: number[] = [0];
  let time = interval;

  while (time < duration - interval * 0.05) {
    ticks.push(time);
    time += interval;
  }

  if (ticks[ticks.length - 1] < duration - 0.05) {
    ticks.push(duration);
  }

  return ticks;
}

/** Repères mineurs entre deux labels majeurs (sans texte). */
export function getTimelineSubTickInterval(majorInterval: number): number {
  if (majorInterval >= 30) return 5;
  if (majorInterval >= 10) return 1;
  if (majorInterval >= 5) return 1;
  if (majorInterval >= 2) return 0.5;
  return 0.25;
}

export function buildTimelineSubTickTimes(
  duration: number,
  majorInterval: number,
  majorTicks: number[],
): number[] {
  if (duration <= 0) return [];

  const subInterval = getTimelineSubTickInterval(majorInterval);
  const majorSet = new Set(majorTicks.map((tick) => tick.toFixed(3)));
  const subTicks: number[] = [];

  let time = subInterval;
  while (time < duration - subInterval * 0.05) {
    const key = time.toFixed(3);
    if (!majorSet.has(key)) {
      subTicks.push(time);
    }
    time += subInterval;
  }

  return subTicks;
}

export function formatTimelineRulerLabel(seconds: number): string {
  if (seconds === 0) return "0:00";
  return formatClipTime(seconds);
}
