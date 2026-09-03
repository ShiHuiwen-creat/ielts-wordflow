import { useCallback, useContext, useEffect, useState } from 'react';
import { summarizeProgress, type ProgressSummary } from '../features/progress/summarizeProgress';
import { buildDailyQueue } from '../features/study-session/buildDailyQueue';
import type { StudyQueueItem } from '../features/study-session/types';
import type { WordProgress } from '../features/scheduler/types';
import type { AppSettings } from '../lib/storage/types';
import { AppContext } from './appContext';

export interface DashboardViewModel {
  settings: AppSettings;
  today: string;
  queue: readonly StudyQueueItem[];
  reviewCount: number;
  newCount: number;
  progressSummary: ProgressSummary;
}

type DashboardState =
  | { status: 'loading' }
  | { status: 'storage-blocked' }
  | {
      status: 'ready';
      dashboard: DashboardViewModel;
      source: { progress: readonly WordProgress[]; utcOffsetMinutes: number };
    };

function localDateKey(now: Date, utcOffsetMinutes: number): string {
  return new Date(now.getTime() + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function useDashboard() {
  const dependencies = useContext(AppContext);
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  if (dependencies === undefined) {
    throw new Error('useDashboard must be used within AppProviders.');
  }

  const { repository, vocabulary, now, utcOffsetMinutes } = dependencies;

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [settings, progress, dailyStats] = await Promise.all([
          repository.getSettings(),
          repository.getAllProgress(),
          repository.getAllDailyStats(),
        ]);
        const offset = utcOffsetMinutes();
        const today = localDateKey(now(), offset);
        const progressSummary = summarizeProgress(progress, dailyStats, today);
        const queue = buildDailyQueue({
          entries: vocabulary,
          progress,
          today,
          utcOffsetMinutes: offset,
          goal: settings.dailyGoal,
          newLearnedToday: progressSummary.today.newLearned,
        });

        if (active) {
          setState({
            status: 'ready',
            dashboard: {
              settings,
              today,
              queue,
              reviewCount: queue.filter(({ kind }) => kind === 'review').length,
              newCount: queue.filter(({ kind }) => kind === 'new').length,
              progressSummary,
            },
            source: { progress, utcOffsetMinutes: offset },
          });
        }
      } catch {
        if (active) {
          setState({ status: 'storage-blocked' });
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [now, repository, utcOffsetMinutes, vocabulary]);

  const applySettings = useCallback((settings: AppSettings) => {
    setState((current) => {
      if (current.status !== 'ready') {
        return current;
      }

      const queue = buildDailyQueue({
        entries: vocabulary,
        progress: current.source.progress,
        today: current.dashboard.today,
        utcOffsetMinutes: current.source.utcOffsetMinutes,
        goal: settings.dailyGoal,
        newLearnedToday: current.dashboard.progressSummary.today.newLearned,
      });

      return {
        ...current,
        dashboard: {
          ...current.dashboard,
          settings,
          queue,
          reviewCount: queue.filter(({ kind }) => kind === 'review').length,
          newCount: queue.filter(({ kind }) => kind === 'new').length,
        },
      };
    });
  }, [vocabulary]);

  return { state, applySettings };
}
