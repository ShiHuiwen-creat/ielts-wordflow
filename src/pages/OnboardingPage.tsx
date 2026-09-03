import { useContext, useState, type FormEvent } from 'react';
import type { DailyGoal } from '../features/study-session/types';
import type { AppSettings } from '../lib/storage/types';
import { AppContext } from '../app/appContext';

interface OnboardingPageProps {
  settings: AppSettings;
  onComplete: (settings: AppSettings) => void;
}

const goals: DailyGoal[] = [10, 20, 30];

export function OnboardingPage({ settings, onComplete }: OnboardingPageProps) {
  const dependencies = useContext(AppContext);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(settings.dailyGoal);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (dependencies === undefined) {
    throw new Error('OnboardingPage must be used within AppProviders.');
  }
  const { repository } = dependencies;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSettings: AppSettings = {
      ...settings,
      dailyGoal,
      onboardingComplete: true,
    };

    setIsSaving(true);
    setError('');

    try {
      await repository.saveSettings(nextSettings);
      onComplete(nextSettings);
    } catch {
      setError('保存失败，请检查浏览器存储设置后重试。');
      setIsSaving(false);
    }
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="onboarding-brand" aria-hidden="true">W</div>
        <p className="eyebrow">IELTS WordFlow</p>
        <h1 id="onboarding-title">每天一点，稳稳记住雅思词汇</h1>
        <p className="onboarding-intro">
          我们会先安排到期复习，再加入适量新词。所有进度只保存在这台设备上。
        </p>

        <form onSubmit={(event) => void submit(event)}>
          <fieldset className="goal-picker">
            <legend>选择每日新词目标</legend>
            <div className="goal-picker__options">
              {goals.map((goal) => (
                <label className="goal-option" key={goal}>
                  <input
                    aria-label={`每天 ${goal} 个`}
                    checked={dailyGoal === goal}
                    name="daily-goal"
                    onChange={() => setDailyGoal(goal)}
                    type="radio"
                    value={goal}
                  />
                  <span>
                    <strong>每天 {goal} 个</strong>
                    <small>{goal === 10 ? '轻松坚持' : goal === 20 ? '稳步提升' : '集中冲刺'}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {error !== '' ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button--primary button--wide" disabled={isSaving} type="submit">
            {isSaving ? '正在保存…' : '开始学习'}
          </button>
        </form>
      </section>
    </main>
  );
}
