import type { StudySessionAction, StudySessionState } from './types';

const RELEARNING_DISTANCE = 10;

export function sessionReducer(
  state: StudySessionState,
  action: StudySessionAction,
): StudySessionState {
  if (action.type === 'answer-revealed') {
    return { ...state, isAnswerRevealed: true };
  }

  if (!state.current) {
    return state;
  }

  const queue = state.queue.slice(1);
  if (action.rating === 'again') {
    queue.splice(Math.min(RELEARNING_DISTANCE, queue.length), 0, state.current);
  }

  return {
    queue,
    current: queue[0],
    isAnswerRevealed: false,
    summary: {
      ...state.summary,
      [action.rating]: state.summary[action.rating] + 1,
    },
  };
}
