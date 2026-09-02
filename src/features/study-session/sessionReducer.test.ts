import { describe, expect, it } from 'vitest';
import { sessionReducer } from './sessionReducer';
import type { StudyQueueItem, StudySessionState } from './types';

function item(index: number): StudyQueueItem {
  return { wordId: `word-${index}`, kind: index % 2 === 0 ? 'review' : 'new' };
}

function stateWithCards(count: number): StudySessionState {
  const queue = Array.from({ length: count }, (_, index) => item(index + 1));

  return {
    queue,
    current: queue[0],
    isAnswerRevealed: false,
    summary: { again: 0, hard: 0, known: 0 },
  };
}

describe('sessionReducer', () => {
  it('requeues an again card behind at least ten remaining cards', () => {
    const stateWithTwelveCards = stateWithCards(12);

    const next = sessionReducer(stateWithTwelveCards, { type: 'rated', rating: 'again' });

    expect(next.queue[10].wordId).toBe(stateWithTwelveCards.current!.wordId);
    expect(next.current).toEqual({ wordId: 'word-2', kind: 'review' });
  });

  it('puts an again card at the end when fewer than ten cards remain', () => {
    const state = stateWithCards(3);

    const next = sessionReducer(state, { type: 'rated', rating: 'again' });

    expect(next.queue.map((queueItem) => queueItem.wordId)).toEqual(['word-2', 'word-3', 'word-1']);
  });

  it('reveals an answer and resets the reveal state after a rating', () => {
    const state = stateWithCards(2);

    const revealed = sessionReducer(state, { type: 'answer-revealed' });
    const rated = sessionReducer(revealed, { type: 'rated', rating: 'hard' });

    expect(revealed.isAnswerRevealed).toBe(true);
    expect(rated.isAnswerRevealed).toBe(false);
  });

  it('records exact rating counts when the session completes', () => {
    const state = stateWithCards(2);

    const afterHard = sessionReducer(state, { type: 'rated', rating: 'hard' });
    const completed = sessionReducer(afterHard, { type: 'rated', rating: 'known' });

    expect(completed).toMatchObject({
      queue: [],
      current: undefined,
      isAnswerRevealed: false,
      summary: { again: 0, hard: 1, known: 1 },
    });
  });

  it('does not mutate the existing session state', () => {
    const state = stateWithCards(2);
    const snapshot = structuredClone(state);

    sessionReducer(state, { type: 'rated', rating: 'again' });

    expect(state).toEqual(snapshot);
  });
});
