import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { StorageRepository } from '../lib/storage/types';
import { AppContext } from './appContext';
import { AppProviders } from './AppProviders';

function repository(): StorageRepository {
  return {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    getProgress: vi.fn(),
    getAllProgress: vi.fn(),
    getDailyStats: vi.fn(),
    getAllDailyStats: vi.fn(),
    saveReview: vi.fn(),
    replaceAll: vi.fn(),
    close: vi.fn(),
  };
}

function VocabularyCount() {
  const dependencies = useContext(AppContext);
  return <output aria-label="production vocabulary count">{dependencies?.vocabulary.length}</output>;
}

describe('AppProviders production defaults', () => {
  it('supplies the bundled core vocabulary when no test fixture is provided', () => {
    render(
      <AppProviders repository={repository()}>
        <VocabularyCount />
      </AppProviders>,
    );

    expect(screen.getByLabelText('production vocabulary count')).toHaveTextContent('300');
  });
});
