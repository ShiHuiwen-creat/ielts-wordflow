export function localDateKey(now: Date, utcOffsetMinutes: number): string {
  return new Date(now.getTime() + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function millisecondsUntilNextLocalDay(
  now: Date,
  utcOffsetMinutes: number,
): number {
  const localTimestamp = now.getTime() + utcOffsetMinutes * 60_000;
  const local = new Date(localTimestamp);
  const nextMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
  );

  return Math.max(1, nextMidnight - localTimestamp);
}
