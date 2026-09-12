import type { DayActivity } from '../features/progress/summarizeProgress';

function dateLabel(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}月${day}日`;
}

export function StatChart({ days }: { days: readonly DayActivity[] }) {
  const max = Math.max(1, ...days.map(({ total }) => total));

  return (
    <figure aria-labelledby="weekly-chart-title" className="card stat-chart">
      <figcaption id="weekly-chart-title">近 7 天学习量</figcaption>
      <ul className="stat-chart__plot">
        {days.map(({ date, total }) => (
          <li key={date}>
            <div className="stat-chart__bar-space" aria-hidden="true">
              <span
                className="stat-chart__bar"
                style={{ height: `${Math.round((total / max) * 100)}%` }}
              />
            </div>
            <time dateTime={date}>{dateLabel(date)}</time>
            <strong>{total} 个</strong>
          </li>
        ))}
      </ul>
    </figure>
  );
}
