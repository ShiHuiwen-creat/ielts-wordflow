import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function DialogHarness({ onBackground }: { onBackground: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <main>
      <button onClick={() => setOpen(true)} type="button">打开确认框</button>
      <button onClick={onBackground} type="button">背景操作</button>
      {open ? (
        <ConfirmDialog
          confirmLabel="确认操作"
          onCancel={() => setOpen(false)}
          onConfirm={() => undefined}
          title="确认测试"
        >
          <p>确认内容</p>
        </ConfirmDialog>
      ) : null}
    </main>
  );
}

function openDialog() {
  const opener = screen.getByRole('button', { name: '打开确认框' });
  opener.focus();
  fireEvent.click(opener);
  return screen.getByRole('dialog', { name: '确认测试' });
}

describe('ConfirmDialog', () => {
  it('wraps forward and backward Tab focus inside the modal', () => {
    render(<DialogHarness onBackground={() => undefined} />);

    const dialog = openDialog();
    const cancel = within(dialog).getByRole('button', { name: '取消' });
    const confirm = within(dialog).getByRole('button', { name: '确认操作' });
    expect(cancel).toHaveFocus();

    confirm.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    cancel.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
  });

  it('hides and inerts the background, blocks its interactions, then restores it', () => {
    const onBackground = vi.fn();
    const { container } = render(<DialogHarness onBackground={onBackground} />);
    const backgroundButton = screen.getByRole('button', { name: '背景操作' });
    const dialog = openDialog();
    const cancel = within(dialog).getByRole('button', { name: '取消' });

    expect(container).toHaveAttribute('aria-hidden', 'true');
    expect(container).toHaveAttribute('inert');

    backgroundButton.focus();
    expect(cancel).toHaveFocus();
    fireEvent.click(backgroundButton);
    expect(onBackground).not.toHaveBeenCalled();

    fireEvent.click(cancel);
    expect(container).not.toHaveAttribute('aria-hidden');
    expect(container).not.toHaveAttribute('inert');
  });
});
