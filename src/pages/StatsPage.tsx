import { StatChart } from '../components/StatChart';
import type { ProgressSummary } from '../features/progress/summarizeProgress';

interface StatsPageProps {
  summary: ProgressSummary;
  totalVocabulary: number;
}

export function StatsPage({ summary, totalVocabulary }: StatsPageProps) {
  return (
    <section aria-labelledby="stats-title" className="page-stack">
      <div>
        <p className="eyebrow">回顾你的积累</p>
        <h1 id="stats-title">学习统计</h1>
        <p className="page-intro">每一次练习都会计入这里，数值比颜色更清楚地呈现进度。</p>
      </div>

      <div className="stats-overview" aria-label="学习概览">
        <article className="card metric-card">
          <span>今日学习</span>
          <strong>今日完成 {summary.today.total} 个</strong>
          <small>新学 {summary.today.newLearned} · 复习 {summary.today.reviews}</small>
        </article>
        <article className="card metric-card">
          <span>掌握进度</span>
          <strong>已掌握 {summary.masteredCount} / {totalVocabulary}</strong>
          <small>连续学习 {summary.streak} 天</small>
        </article>
      </div>

      <StatChart days={summary.lastSevenDays} />

      <section aria-labelledby="feedback-title" className="card feedback-summary">
        <h2 id="feedback-title">累计反馈分布</h2>
        <ul>
          <li><span aria-hidden="true">↺</span><strong>不认识 {summary.feedback.again} 次</strong></li>
          <li><span aria-hidden="true">≈</span><strong>模糊 {summary.feedback.hard} 次</strong></li>
          <li><span aria-hidden="true">✓</span><strong>认识 {summary.feedback.known} 次</strong></li>
        </ul>
      </section>
    </section>
  );
}
