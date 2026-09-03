import { Link } from 'react-router-dom';
import type { DashboardViewModel } from '../app/useDashboard';

export function TodayPage({ dashboard }: { dashboard: DashboardViewModel }) {
  const { progressSummary, queue, reviewCount, newCount } = dashboard;

  return (
    <div className="page-stack">
      <section className="today-heading" aria-labelledby="today-title">
        <div>
          <p className="eyebrow">今天，继续向前</p>
          <h1 id="today-title">今日学习</h1>
        </div>
        <div className="streak-badge" aria-label={`连续学习 ${progressSummary.streak} 天`}>
          <span aria-hidden="true">✦</span>
          连续 {progressSummary.streak} 天
        </div>
      </section>

      {queue.length === 0 ? (
        <section className="card done-card" aria-labelledby="done-title">
          <span className="done-card__icon" aria-hidden="true">✓</span>
          <h2 id="done-title">今天的任务完成啦</h2>
          <p>做得好。明天回来时，我们会为你准备下一组复习。</p>
        </section>
      ) : (
        <section className="card task-card" aria-labelledby="task-title">
          <div>
            <p className="eyebrow">今日任务</p>
            <h2 id="task-title">还有 {queue.length} 个词</h2>
          </div>
          <div className="task-counts" aria-label="今日任务构成">
            <div>
              <span data-stat="review">{reviewCount}</span>
              <small>待复习</small>
            </div>
            <div>
              <span data-stat="new">{newCount}</span>
              <small>新词</small>
            </div>
          </div>
          <Link className="button button--primary button--wide" to="/study">
            开始今日学习
          </Link>
        </section>
      )}

      <section className="progress-grid" aria-label="学习进度">
        <article className="card stat-card">
          <span className="stat-card__icon" aria-hidden="true">✓</span>
          <div>
            <strong>已掌握 {progressSummary.masteredCount} 个</strong>
            <span>累计掌握</span>
          </div>
        </article>
        <article className="card stat-card">
          <span className="stat-card__icon" aria-hidden="true">↗</span>
          <div>
            <strong>今日已学习 {progressSummary.today.total}</strong>
            <span>新词与复习</span>
          </div>
        </article>
      </section>
    </div>
  );
}
