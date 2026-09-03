import { ErrorState } from '../components/ErrorState';

export function StorageBlockedPage() {
  return (
    <main className="centered-page">
      <ErrorState
        title="无法打开本地存储"
        description="IELTS WordFlow 需要浏览器本地存储来安全保存学习进度。请退出无痕模式，允许网站存储数据，然后重新加载。"
        actionLabel="重新加载"
        onAction={() => window.location.reload()}
      />
    </main>
  );
}
