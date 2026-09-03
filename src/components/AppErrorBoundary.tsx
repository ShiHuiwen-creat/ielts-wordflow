import { Component, type ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface AppErrorBoundaryProps {
  children: ReactNode;
  onReload?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  private reload = () => {
    if (this.props.onReload !== undefined) {
      this.props.onReload();
      return;
    }

    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="centered-page">
          <ErrorState
            title="页面出了点问题"
            description="你的学习数据仍保存在本机。重新加载后可以继续。"
            actionLabel="重新加载"
            onAction={this.reload}
          />
        </main>
      );
    }

    return this.props.children;
  }
}
