import Dexie, { type EntityTable } from 'dexie';
import type { WordProgress } from '../../features/scheduler/types';
import type { AppSettings, DailyStats } from './types';

export interface SettingsRecord extends AppSettings {
  id: 'app';
}

export class WordflowDatabase extends Dexie {
  settings!: EntityTable<SettingsRecord, 'id'>;
  progress!: EntityTable<WordProgress, 'wordId'>;
  dailyStats!: EntityTable<DailyStats, 'date'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      settings: '&id',
      progress: '&wordId',
      dailyStats: '&date',
    });
  }
}
