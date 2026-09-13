import type { VocabularyEntry } from '../features/vocabulary/types';

interface WordCardProps {
  entry: VocabularyEntry;
  isAnswerRevealed: boolean;
  speechAvailable: boolean;
  onReveal: () => void;
  onSpeak: () => void;
}

export function WordCard({
  entry,
  isAnswerRevealed,
  speechAvailable,
  onReveal,
  onSpeak,
}: WordCardProps) {
  return (
    <article className="card word-card" aria-labelledby="current-word">
      <div className="word-card__prompt">
        <p className="eyebrow">回想它的含义</p>
        <h1 id="current-word">{entry.word}</h1>
        <button
          className="speech-button"
          type="button"
          onClick={onSpeak}
          disabled={!speechAvailable}
          aria-label={`朗读单词 ${entry.word}`}
        >
          <span aria-hidden="true">◖</span>
          朗读
        </button>
        {!speechAvailable && (
          <p className="speech-hint">暂无可用英语发音，仍可继续学习。</p>
        )}
      </div>

      {isAnswerRevealed ? (
        <div className="word-answer">
          <div className="word-answer__meta">
            <span>{entry.phonetic}</span>
            <span>{entry.partOfSpeech}</span>
          </div>
          <p className="word-answer__definition">{entry.definitionZh}</p>
          <div className="word-answer__example">
            <p>{entry.example}</p>
            <p lang="zh-CN">{entry.exampleZh}</p>
          </div>
        </div>
      ) : (
        <button className="button button--primary button--wide" type="button" onClick={onReveal}>
          查看答案
        </button>
      )}
    </article>
  );
}
