import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SdkFactory } from 'app/core/factory/sdk';
import { AccountSetupPendingNotice } from './AccountSetupPendingNotice';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: () => ({ translate: (key: string) => key }),
}));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: { getNewApiInstance: vi.fn() },
}));

vi.mock('services/error.service', () => ({
  default: { reportError: vi.fn() },
}));

const PENDING_EMAIL = 'Pending@Example.com';

const mockResendEndpoint = (resendAccountSetupEmail: ReturnType<typeof vi.fn>) => {
  vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
    createAuthClient: () => ({ resendAccountSetupEmail }),
  } as unknown as ReturnType<typeof SdkFactory.getNewApiInstance>);
};

describe('Pending account setup notice', () => {
  beforeEach(() => {
    globalThis.grecaptcha = {
      ready: (callback: () => void) => callback(),
      execute: async () => 'captcha-token',
    } as unknown as typeof globalThis.grecaptcha;
    mockResendEndpoint(vi.fn().mockResolvedValue(undefined));
  });

  test('When the notice is shown, then the user is asked to finish the setup and can resend the email', () => {
    render(<AccountSetupPendingNotice email={PENDING_EMAIL} />);

    expect(screen.getByText('auth.accountSetupPending.title')).toBeInTheDocument();
    expect(screen.getByText('auth.accountSetupPending.message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'auth.accountSetupPending.resend' })).toBeInTheDocument();
  });

  test('When the user resends the email, then it is sent to their address and a confirmation replaces the button', async () => {
    const resendAccountSetupEmail = vi.fn().mockResolvedValue(undefined);
    mockResendEndpoint(resendAccountSetupEmail);
    render(<AccountSetupPendingNotice email={PENDING_EMAIL} />);

    fireEvent.click(screen.getByRole('button', { name: 'auth.accountSetupPending.resend' }));

    expect(await screen.findByRole('status')).toHaveTextContent('auth.accountSetupPending.emailSent');
    expect(resendAccountSetupEmail).toHaveBeenCalledWith('pending@example.com');
    expect(screen.queryByRole('button', { name: 'auth.accountSetupPending.resend' })).not.toBeInTheDocument();
  });

  test('When resending the email fails, then an error is shown and the user can try again', async () => {
    mockResendEndpoint(vi.fn().mockRejectedValue(new Error('Network error')));
    render(<AccountSetupPendingNotice email={PENDING_EMAIL} />);

    fireEvent.click(screen.getByRole('button', { name: 'auth.accountSetupPending.resend' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('auth.accountSetupPending.resendFailed');
    expect(screen.getByRole('button', { name: 'auth.accountSetupPending.resend' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
