import type { ReviewRating } from '../features/scheduler/types';

interface RatingControlsProps {
  busy: boolean;
  onRate: (rating: ReviewRating) => void;
}

const RATINGS = [
  { rating: 'again', label: '不认识', hint: '稍后再练' },
  { rating: 'hard', label: '模糊', hint: '需要巩固' },
  { rating: 'known', label: '认识', hint: '记得清楚' },
] as const;

export function RatingControls({ busy, onRate }: RatingControlsProps) {
  return (
    <section className="rating-section" aria-labelledby="rating-title" aria-busy={busy}>
      <h2 id="rating-title">这次记得怎么样？</h2>
      <div className="rating-controls">
        {RATINGS.map(({ rating, label, hint }) => (
          <button
            className={`rating-button rating-button--${rating}`}
            type="button"
            key={rating}
            aria-label={label}
            disabled={busy}
            onClick={() => onRate(rating)}
          >
            <strong>{label}</strong>
            <span>{hint}</span>
          </button>
        ))}
      </div>
      {busy && <p className="save-status" role="status">正在保存本次反馈…</p>}
    </section>
  );
}
