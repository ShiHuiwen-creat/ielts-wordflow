import { Link } from 'react-router-dom';
import type { StudySessionSummary } from '../features/study-session/types';

export function SessionSummary({ summary }: { summary: StudySessionSummary }) {
  const total = summary.again + summary.hard + summary.known;

  return (
    <section className="card session-summary" aria-labelledby="summary-title">
      <span className="done-card__icon" aria-hidden="true">✓</span>
      <p className="eyebrow">完成 {total} 次反馈</p>
      <h1 id="summary-title">本轮学习完成</h1>
      <p>每一次回想都在加深记忆。下一批到期词会自动出现在今日任务中。</p>
      <dl className="summary-counts" aria-label="本轮反馈分布">
        <div>
          <dt>不认识</dt>
          <dd data-summary="again">{summary.again}</dd>
        </div>
        <div>
          <dt>模糊</dt>
          <dd data-summary="hard">{summary.hard}</dd>
        </div>
        <div>
          <dt>认识</dt>
          <dd data-summary="known">{summary.known}</dd>
        </div>
      </dl>
      <Link className="button button--primary button--wide" to="/">返回今日页</Link>
    </section>
  );
}
