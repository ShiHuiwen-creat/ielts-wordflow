import { scheduleReview } from '../features/scheduler/scheduleReview';
import type { ReviewRating } from '../features/scheduler/types';
import { sessionReducer } from '../features/study-session/sessionReducer';
import type { StudySessionState } from '../features/study-session/types';
import type { StorageRepository } from '../lib/storage/types';

export interface StudyService {
  getState(): StudySessionState;
  revealAnswer(): StudySessionState;
  rateCurrent(rating: ReviewRating, reviewedAt: Date): Promise<StudySessionState>;
}

interface CreateStudyServiceInput {
  repository: StorageRepository;
  initialSession: StudySessionState;
  reviewDate: string;
}

export function createStudyService({
  repository,
  initialSession,
  reviewDate,
}: CreateStudyServiceInput): StudyService {
  let state = initialSession;

  return {
    getState() {
      return state;
    },

    revealAnswer() {
      state = sessionReducer(state, { type: 'answer-revealed' });
      return state;
    },

    async rateCurrent(rating, reviewedAt) {
      const current = state.current;
      if (current === undefined) {
        return state;
      }

      const progress = await repository.getProgress(current.wordId);
      const scheduled = scheduleReview(progress, rating, reviewedAt, current.wordId);

      await repository.saveReview(scheduled, reviewDate);
      state = sessionReducer(state, { type: 'rated', rating });

      return state;
    },
  };
}
