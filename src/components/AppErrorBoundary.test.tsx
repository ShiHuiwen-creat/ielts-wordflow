import { render, screen } from '@testing-library/react';
import { Component, type ReactNode } from 'react';
import { indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

class BrokenChild extends Component {
  render(): ReactNode {
    throw new Error('render failed');
  }
}

describe('AppErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('offers reload without deleting browser storage', () => {
    const reload = vi.fn();
    vi.stubGlobal('indexedDB', indexedDB);
    const deleteDatabase = vi.spyOn(indexedDB, 'deleteDatabase');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary onReload={reload}>
        <BrokenChild />
      </AppErrorBoundary>,
    );

    screen.getByRole('button', { name: '重新加载' }).click();

    expect(reload).toHaveBeenCalledOnce();
    expect(deleteDatabase).not.toHaveBeenCalled();
  });
});
