import { useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  destructive?: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const blockedBackgroundEvents = ['click', 'pointerdown', 'input', 'change', 'submit'] as const;

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy = false,
  destructive = false,
  error = '',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const backdropRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const invokingControl = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const backdrop = backdropRef.current;
    if (backdrop === null) {
      return;
    }

    const backgroundElements = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop)
      .map((element) => ({
        element,
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.getAttribute('inert'),
      }));

    cancelRef.current?.focus();
    for (const { element } of backgroundElements) {
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
    }

    const blockBackgroundEvent = (event: Event) => {
      if (event.target instanceof Node && !backdrop.contains(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };
    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !backdrop.contains(event.target)) {
        cancelRef.current?.focus();
      }
    };

    for (const eventName of blockedBackgroundEvents) {
      document.addEventListener(eventName, blockBackgroundEvent, true);
    }
    document.addEventListener('focusin', keepFocusInside, true);

    return () => {
      for (const eventName of blockedBackgroundEvents) {
        document.removeEventListener(eventName, blockBackgroundEvent, true);
      }
      document.removeEventListener('focusin', keepFocusInside, true);

      for (const { element, ariaHidden, inert } of backgroundElements) {
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
        if (inert === null) {
          element.removeAttribute('inert');
        } else {
          element.setAttribute('inert', inert);
        }
      }

      if (invokingControl?.isConnected) {
        invokingControl.focus();
      }
    };
  }, []);

  function keepKeyboardFocusInside(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="dialog-backdrop" ref={backdropRef}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-dialog card"
        onKeyDown={keepKeyboardFocusInside}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 id={titleId}>{title}</h2>
        <div className="confirm-dialog__body">{children}</div>
        {error !== '' ? (
          <p className="form-error confirm-dialog__error" role="alert">{error}</p>
        ) : null}
        <div className="confirm-dialog__actions">
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            取消
          </button>
          <button
            className={`button ${destructive ? 'button--danger' : 'button--primary'}`}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? '正在处理…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
