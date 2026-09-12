import type { WordProgress } from '../scheduler/types';
import type { DailyStats } from '../../lib/storage/types';

export interface DayActivity {
  date: string;
  total: number;
}

export interface ProgressSummary {
  masteredCount: number;
  feedback: {
    again: number;
    hard: number;
    known: number;
  };
  today: {
    newLearned: number;
    reviews: number;
    total: number;
  };
  lastSevenDays: DayActivity[];
  streak: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

function shiftDate(date: string, days: number): string {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return new Date(timestamp + days * ONE_DAY_MS).toISOString().slice(0, 10);
}

function activityCount(stats: DailyStats | undefined): number {
  return stats === undefined ? 0 : stats.newLearned + stats.reviews;
}

export function summarizeProgress(
  progress: readonly WordProgress[],
  dailyStats: readonly DailyStats[],
  today: string,
): ProgressSummary {
  const statsByDate = new Map(dailyStats.map((stats) => [stats.date, stats]));
  const todayStats = statsByDate.get(today);
  const todayNewLearned = todayStats?.newLearned ?? 0;
  const todayReviews = todayStats?.reviews ?? 0;
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(today, index - 6);
    return { date, total: activityCount(statsByDate.get(date)) };
  });

  let streakDate = today;
  if (activityCount(statsByDate.get(streakDate)) === 0) {
    streakDate = shiftDate(today, -1);
  }

  let streak = 0;
  while (activityCount(statsByDate.get(streakDate)) > 0) {
    streak += 1;
    streakDate = shiftDate(streakDate, -1);
  }

  const feedback = dailyStats.reduce(
    (total, stats) => ({
      again: total.again + stats.again,
      hard: total.hard + stats.hard,
      known: total.known + stats.known,
    }),
    { again: 0, hard: 0, known: 0 },
  );

  return {
    masteredCount: progress.filter(({ mastered }) => mastered).length,
    feedback,
    today: {
      newLearned: todayNewLearned,
      reviews: todayReviews,
      total: todayNewLearned + todayReviews,
    },
    lastSevenDays,
    streak,
  };
}
