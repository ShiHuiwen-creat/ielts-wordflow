import { Link, useParams } from 'react-router-dom';
import type { WordProgress } from '../features/scheduler/types';
import type { VocabularyEntry } from '../features/vocabulary/types';

interface VocabularyDetailPageProps {
  vocabulary: readonly VocabularyEntry[];
  progress: readonly WordProgress[];
}

export function VocabularyDetailPage({ vocabulary, progress }: VocabularyDetailPageProps) {
  const { wordId = '' } = useParams();
  const entry = vocabulary.find(({ id }) => id === wordId);

  if (entry === undefined) {
    return (
      <section aria-labelledby="missing-word-title" className="page-stack">
        <p className="eyebrow">词条详情</p>
        <div className="card empty-result">
          <h1 id="missing-word-title">找不到这个单词</h1>
          <p>词库内容可能已经更新，请返回词库重新查找。</p>
          <Link className="button button--primary" to="/vocabulary">返回词库</Link>
        </div>
      </section>
    );
  }

  const wordProgress = progress.find(({ wordId: id }) => id === entry.id);
  const status = wordProgress === undefined ? '未学习' : wordProgress.mastered ? '已掌握' : '学习中';

  return (
    <section aria-labelledby="word-detail-title" className="page-stack vocabulary-detail">
      <Link aria-label="返回词库" className="back-link" to="/vocabulary">
        <span aria-hidden="true">← </span>返回词库
      </Link>
      <article className="card vocabulary-detail__card">
        <div className="vocabulary-detail__heading">
          <div>
            <p className="eyebrow">词条详情</p>
            <h1 id="word-detail-title">{entry.word}</h1>
          </div>
          <span className="status-pill">{status}</span>
        </div>
        <p className="vocabulary-detail__meta">
          <span>{entry.phonetic}</span>
          <span aria-hidden="true"> · </span>
          <span>{entry.partOfSpeech}</span>
        </p>
        <p className="vocabulary-detail__definition">{entry.definitionZh}</p>
        <div className="vocabulary-detail__example">
          <h2>例句</h2>
          <p>{entry.example}</p>
          <p>{entry.exampleZh}</p>
        </div>
        <div className="tag-list" aria-label="词汇标签">
          {entry.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </article>
    </section>
  );
}
