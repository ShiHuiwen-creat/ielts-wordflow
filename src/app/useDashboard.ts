import { useCallback, useContext, useEffect, useState } from 'react';
import { summarizeProgress, type ProgressSummary } from '../features/progress/summarizeProgress';
import { buildDailyQueue } from '../features/study-session/buildDailyQueue';
import type { StudyQueueItem } from '../features/study-session/types';
import type { WordProgress } from '../features/scheduler/types';
import type { AppSettings } from '../lib/storage/types';
import { AppContext } from './appContext';
import { localDateKey, millisecondsUntilNextLocalDay } from './localDate';

const DATE_BOUNDARY_CHECK_INTERVAL = 60_000;

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

export function useDashboard() {
  const dependencies = useContext(AppContext);
  const [state, setState] = useState<DashboardState>({ status: 'loading' });
  const [refreshToken, setRefreshToken] = useState(0);

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
        const vocabularyIds = new Set(vocabulary.map(({ id }) => id));
        const knownProgress = progress.filter(({ wordId }) => vocabularyIds.has(wordId));
        const offset = utcOffsetMinutes();
        const today = localDateKey(now(), offset);
        const progressSummary = summarizeProgress(knownProgress, dailyStats, today);
        const queue = buildDailyQueue({
          entries: vocabulary,
          progress: knownProgress,
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
            source: { progress: knownProgress, utcOffsetMinutes: offset },
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
  }, [now, refreshToken, repository, utcOffsetMinutes, vocabulary]);

  const refreshDashboard = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let midnightTimer: number | undefined;
    let observedDate = localDateKey(now(), utcOffsetMinutes());

    const scheduleMidnightRefresh = () => {
      if (midnightTimer !== undefined) {
        window.clearTimeout(midnightTimer);
      }
      const current = now();
      midnightTimer = window.setTimeout(() => {
        const currentDate = localDateKey(now(), utcOffsetMinutes());
        if (currentDate !== observedDate) {
          observedDate = currentDate;
          refreshDashboard();
        }
        scheduleMidnightRefresh();
      }, Math.min(
        DATE_BOUNDARY_CHECK_INTERVAL,
        millisecondsUntilNextLocalDay(current, utcOffsetMinutes()),
      ));
    };
    const refreshAndReschedule = () => {
      observedDate = localDateKey(now(), utcOffsetMinutes());
      refreshDashboard();
      scheduleMidnightRefresh();
    };
    const refreshOnFocus = () => refreshAndReschedule();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshAndReschedule();
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    scheduleMidnightRefresh();

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      if (midnightTimer !== undefined) {
        window.clearTimeout(midnightTimer);
      }
    };
  }, [now, refreshDashboard, utcOffsetMinutes]);

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

  return { state, applySettings, refreshDashboard };
}
