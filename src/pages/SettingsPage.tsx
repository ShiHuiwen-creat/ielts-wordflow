import { useState, type ChangeEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { DailyGoal } from '../features/study-session/types';
import { createBackup, restoreBackup, validateBackup } from '../lib/storage/backup';
import type { AppSettings, BackupData, StorageRepository } from '../lib/storage/types';

interface SettingsPageProps {
  settings: AppSettings;
  repository: StorageRepository;
  onDashboardChanged: (settings?: AppSettings) => void;
}

const goals: DailyGoal[] = [10, 20, 30];

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(new Error('无法读取备份文件')));
    reader.readAsText(file);
  });
}

export function SettingsPage({
  settings,
  repository,
  onDashboardChanged,
}: SettingsPageProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [busyAction, setBusyAction] = useState<'settings' | 'export' | 'import' | 'reset' | null>(null);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [status, setStatus] = useState('');

  async function persistSettings(nextSettings: AppSettings) {
    const previousSettings = localSettings;
    setLocalSettings(nextSettings);
    setBusyAction('settings');
    setError('');
    setDialogError('');
    setStatus('');
    try {
      await repository.saveSettings(nextSettings);
      onDashboardChanged(nextSettings);
      setStatus('设置已保存');
    } catch {
      setLocalSettings(previousSettings);
      setError('设置保存失败，请重试。');
    } finally {
      setBusyAction(null);
    }
  }

  async function exportData() {
    setBusyAction('export');
    setError('');
    setStatus('');
    try {
      const backup = await createBackup(repository);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ielts-wordflow-backup.json';
        link.click();
      } finally {
        URL.revokeObjectURL(url);
      }
      setStatus('数据已导出');
    } catch {
      setError('导出失败，请重试。');
    } finally {
      setBusyAction(null);
    }
  }

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) {
      return;
    }

    setError('');
    setStatus('');
    setPendingBackup(null);
    try {
      const parsed: unknown = JSON.parse(await readFile(file));
      setPendingBackup(validateBackup(parsed));
    } catch (cause) {
      const message = cause instanceof Error && cause.message === '不支持的备份版本'
        ? cause.message
        : '备份文件无效，请选择有效的 JSON 备份。';
      setError(message);
    }
  }

  async function confirmImport() {
    if (pendingBackup === null) {
      return;
    }

    setBusyAction('import');
    setError('');
    setDialogError('');
    try {
      await restoreBackup(repository, pendingBackup);
      setLocalSettings(pendingBackup.settings);
      setPendingBackup(null);
      setStatus('数据导入成功');
      onDashboardChanged();
    } catch {
      setDialogError('导入失败，现有数据未更改。请重试或取消。');
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmReset() {
    setBusyAction('reset');
    setError('');
    setDialogError('');
    try {
      await repository.replaceAll({
        settings: localSettings,
        progress: [],
        dailyStats: [],
      });
      setShowResetDialog(false);
      setStatus('学习数据已重置');
      onDashboardChanged();
    } catch {
      setDialogError('重置失败，现有数据未更改。请重试或取消。');
    } finally {
      setBusyAction(null);
    }
  }

  const controlsDisabled = busyAction !== null;

  return (
    <section aria-labelledby="settings-title" className="page-stack settings-page">
      <div>
        <p className="eyebrow">按你的节奏学习</p>
        <h1 id="settings-title">设置</h1>
        <p className="page-intro">学习数据只保存在当前浏览器中，建议定期导出备份。</p>
      </div>

      <section aria-labelledby="learning-settings-title" className="card settings-section">
        <h2 id="learning-settings-title">学习偏好</h2>
        <fieldset className="goal-picker settings-goal-picker" disabled={controlsDisabled}>
          <legend>每日新词目标</legend>
          <div className="goal-picker__options">
            {goals.map((goal) => (
              <label className="goal-option" key={goal}>
                <input
                  aria-label={`每天 ${goal} 个`}
                  checked={localSettings.dailyGoal === goal}
                  name="settings-daily-goal"
                  onChange={() => void persistSettings({ ...localSettings, dailyGoal: goal })}
                  type="radio"
                  value={goal}
                />
                <span><strong>{goal} 个</strong><small>每天新学</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="switch-row">
          <span>
            <strong>学习时自动发音</strong>
            <small>进入新单词时尝试播放英式发音</small>
          </span>
          <input
            aria-label="学习时自动发音"
            checked={localSettings.autoSpeak}
            disabled={controlsDisabled}
            onChange={(event) => void persistSettings({
              ...localSettings,
              autoSpeak: event.target.checked,
            })}
            type="checkbox"
          />
        </label>
      </section>

      <section aria-labelledby="data-tools-title" className="card settings-section">
        <h2 id="data-tools-title">数据管理</h2>
        <p>备份包含学习设置、单词进度和每日统计。</p>
        <div className="data-actions">
          <button
            className="button button--secondary"
            disabled={controlsDisabled}
            onClick={() => void exportData()}
            type="button"
          >
            {busyAction === 'export' ? '正在导出…' : '导出数据'}
          </button>
          <label className={`button button--secondary file-button${controlsDisabled ? ' file-button--disabled' : ''}`}>
            导入数据
            <input
              accept="application/json"
              aria-label="选择备份文件"
              disabled={controlsDisabled}
              onChange={(event) => void selectBackup(event)}
              type="file"
            />
          </label>
        </div>
        <div className="danger-zone">
          <div>
            <strong>重置学习数据</strong>
            <p>清空单词进度和统计，保留当前偏好设置。</p>
          </div>
          <button
            className="button button--danger-outline"
            disabled={controlsDisabled}
            onClick={() => {
              setError('');
              setDialogError('');
              setStatus('');
              setShowResetDialog(true);
            }}
            type="button"
          >
            重置学习数据
          </button>
        </div>
      </section>

      <section aria-labelledby="about-title" className="card settings-section about-section">
        <h2 id="about-title">关于</h2>
        <p>IELTS WordFlow 是一款离线优先的开源词汇学习工具，不收集账号或遥测数据。</p>
      </section>

      {error !== '' ? <p className="form-error" role="alert">{error}</p> : null}
      {status !== '' ? <p className="save-status" role="status">{status}</p> : null}

      {pendingBackup !== null ? (
        <ConfirmDialog
          busy={busyAction === 'import'}
          confirmLabel="确认导入"
          error={dialogError}
          onCancel={() => {
            setDialogError('');
            setPendingBackup(null);
          }}
          onConfirm={() => void confirmImport()}
          title="确认导入数据"
        >
          <p>导入会覆盖当前浏览器中的全部学习数据。请先核对摘要：</p>
          <ul className="import-summary">
            <li>每日目标：{pendingBackup.settings.dailyGoal} 个</li>
            <li>单词进度：{pendingBackup.progress.length} 条</li>
            <li>每日统计：{pendingBackup.dailyStats.length} 天</li>
          </ul>
        </ConfirmDialog>
      ) : null}

      {showResetDialog ? (
        <ConfirmDialog
          busy={busyAction === 'reset'}
          confirmLabel="确认重置"
          destructive
          error={dialogError}
          onCancel={() => {
            setDialogError('');
            setShowResetDialog(false);
          }}
          onConfirm={() => void confirmReset()}
          title="确认重置学习数据"
        >
          <p>此操作会永久清空所有单词进度和统计，且无法撤销。设置会保留。</p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
