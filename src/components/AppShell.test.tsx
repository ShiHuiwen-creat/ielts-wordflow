import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell keyboard navigation', () => {
  it('offers navigation before a long main-content link list and moves focus there', () => {
    render(
      <MemoryRouter>
        <AppShell>
          {Array.from({ length: 300 }, (_, index) => (
            <a href={`/word-${index}`} key={index}>word {index}</a>
          ))}
        </AppShell>
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');
    const skipLink = screen.getByRole('link', { name: '跳到主导航' });
    expect(links[0]).toBe(skipLink);
    expect(skipLink).toHaveAttribute('href', '#main-navigation');

    fireEvent.click(skipLink);

    expect(screen.getByRole('link', { name: '今日' })).toHaveFocus();
  });
});
