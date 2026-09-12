import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WordProgress } from '../features/scheduler/types';
import {
  queryVocabulary,
  type VocabularyStatus,
} from '../features/vocabulary/queryVocabulary';
import type { VocabularyEntry } from '../features/vocabulary/types';

const statusLabels: Record<Exclude<VocabularyStatus, 'all'>, string> = {
  unseen: '未学习',
  learning: '学习中',
  mastered: '已掌握',
};

function entryStatus(progress: WordProgress | undefined): Exclude<VocabularyStatus, 'all'> {
  if (progress === undefined) {
    return 'unseen';
  }
  return progress.mastered ? 'mastered' : 'learning';
}

interface VocabularyPageProps {
  vocabulary: readonly VocabularyEntry[];
  progress: readonly WordProgress[];
}

export function VocabularyPage({ vocabulary, progress }: VocabularyPageProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<VocabularyStatus>('all');
  const progressByWord = useMemo(
    () => new Map(progress.map((record) => [record.wordId, record])),
    [progress],
  );
  const results = useMemo(
    () => queryVocabulary(vocabulary, progress, query, status),
    [progress, query, status, vocabulary],
  );

  return (
    <section aria-labelledby="vocabulary-title" className="page-stack">
      <div>
        <p className="eyebrow">浏览与查找</p>
        <h1 id="vocabulary-title">词库</h1>
        <p className="page-intro">查看全部雅思核心词汇，并按学习状态快速筛选。</p>
      </div>

      <div className="library-controls card">
        <label className="field-control">
          <span>搜索单词或中文释义</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：allocate 或 分配"
            type="search"
            value={query}
          />
        </label>
        <label className="field-control">
          <span>学习状态</span>
          <select
            onChange={(event) => setStatus(event.target.value as VocabularyStatus)}
            value={status}
          >
            <option value="all">全部</option>
            <option value="unseen">未学习</option>
            <option value="learning">学习中</option>
            <option value="mastered">已掌握</option>
          </select>
        </label>
        <p className="result-count" aria-live="polite">找到 {results.length} 个单词</p>
      </div>

      {results.length === 0 ? (
        <div className="card empty-result" role="status">
          <strong>没有找到符合条件的单词</strong>
          <span>试试更短的关键词，或切换学习状态。</span>
        </div>
      ) : (
        <ul className="vocabulary-list">
          {results.map((entry) => {
            const currentStatus = entryStatus(progressByWord.get(entry.id));
            return (
              <li key={entry.id}>
                <Link className="card vocabulary-row" to={`/vocabulary/${encodeURIComponent(entry.id)}`}>
                  <span className="vocabulary-row__word">
                    <strong>{entry.word}</strong>
                    <small>{entry.phonetic} · {entry.partOfSpeech}</small>
                  </span>
                  <span className="vocabulary-row__definition">{entry.definitionZh}</span>
                  <span className={`status-pill status-pill--${currentStatus}`}>
                    {statusLabels[currentStatus]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
