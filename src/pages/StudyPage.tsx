import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createStudyService } from '../app/studyService';
import { RatingControls } from '../components/RatingControls';
import { SessionSummary } from '../components/SessionSummary';
import { WordCard } from '../components/WordCard';
import type { ReviewRating } from '../features/scheduler/types';
import type { StudyQueueItem, StudySessionState } from '../features/study-session/types';
import type { VocabularyEntry } from '../features/vocabulary/types';
import {
  canSpeak,
  speakWord,
  subscribeToSpeechAvailability,
} from '../lib/speech/speakWord';
import type { StorageRepository } from '../lib/storage/types';

interface StudyPageProps {
  queue: readonly StudyQueueItem[];
  vocabulary: readonly VocabularyEntry[];
  repository: StorageRepository;
  utcOffsetMinutes: () => number;
  autoSpeak: boolean;
  now: () => Date;
  onReviewSaved: () => void;
}

function startSession(queue: readonly StudyQueueItem[]): StudySessionState {
  const sessionQueue = [...queue];

  return {
    queue: sessionQueue,
    current: sessionQueue[0],
    isAnswerRevealed: false,
    summary: { again: 0, hard: 0, known: 0 },
  };
}

function hasSameQueue(
  left: readonly StudyQueueItem[],
  right: readonly StudyQueueItem[],
): boolean {
  return left.length === right.length && left.every((item, index) => (
    item.wordId === right[index]?.wordId && item.kind === right[index]?.kind
  ));
}

export function StudyPage({
  queue,
  vocabulary,
  repository,
  utcOffsetMinutes,
  autoSpeak,
  now,
  onReviewSaved,
}: StudyPageProps) {
  const [service, setService] = useState(() => createStudyService({
    repository,
    initialSession: startSession(queue),
    utcOffsetMinutes,
  }));
  const [session, setSession] = useState(service.getState());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(canSpeak);
  const busyRef = useRef(false);
  const hasRatedRef = useRef(false);
  const vocabularyById = new Map(vocabulary.map((entry) => [entry.id, entry]));
  const entry = session.current === undefined
    ? undefined
    : vocabularyById.get(session.current.wordId);

  useEffect(
    () => subscribeToSpeechAvailability(setSpeechAvailable),
    [],
  );

  useEffect(() => {
    if (hasRatedRef.current || hasSameQueue(service.getState().queue, queue)) {
      return;
    }

    const nextService = createStudyService({
      repository,
      initialSession: startSession(queue),
      utcOffsetMinutes,
    });
    setService(nextService);
    setSession(nextService.getState());
    setError(null);
  }, [queue, repository, service, utcOffsetMinutes]);

  useEffect(() => {
    if (autoSpeak && speechAvailable && entry !== undefined) {
      speakWord(entry.word);
    }
  }, [autoSpeak, entry, speechAvailable]);

  if (session.current === undefined) {
    return <SessionSummary summary={session.summary} />;
  }

  if (entry === undefined) {
    return (
      <section className="card error-state" aria-labelledby="missing-word-title">
        <span className="error-state__icon" aria-hidden="true">!</span>
        <h1 id="missing-word-title">找不到这个单词</h1>
        <p>词库内容可能已变更。请返回今日页重新生成学习任务。</p>
        <Link className="button button--primary" to="/">返回今日页</Link>
      </section>
    );
  }

  function revealAnswer() {
    setError(null);
    setSession(service.revealAnswer());
  }

  async function rateCurrent(rating: ReviewRating) {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);

    try {
      const nextSession = await service.rateCurrent(rating, now());
      hasRatedRef.current = true;
      setSession(nextSession);
      onReviewSaved();
    } catch {
      setError('保存失败，请重试。当前单词尚未提交。');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="study-page page-stack">
      <div className="study-progress" aria-label={`本轮剩余 ${session.queue.length} 个词`}>
        <span className="eyebrow">今日学习</span>
        <strong>剩余 {session.queue.length} 个词</strong>
      </div>
      <WordCard
        entry={entry}
        isAnswerRevealed={session.isAnswerRevealed}
        speechAvailable={speechAvailable}
        onReveal={revealAnswer}
        onSpeak={() => speakWord(entry.word)}
      />
      {error !== null && <p className="study-error" role="alert">{error}</p>}
      {session.isAnswerRevealed && (
        <RatingControls busy={busy} onRate={(rating) => void rateCurrent(rating)} />
      )}
    </div>
  );
}
