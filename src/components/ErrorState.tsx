interface ErrorStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <section className="card error-state" aria-labelledby="error-state-title">
      <span className="error-state__icon" aria-hidden="true">!</span>
      <h1 id="error-state-title">{title}</h1>
      <p>{description}</p>
      {actionLabel !== undefined && onAction !== undefined ? (
        <button className="button button--primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
