import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useInvitationValidation } from './useInvitationValidation';
import errorService from 'app/core/services/error.service';

vi.mock('app/core/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

vi.mock('app/core/services/navigation.service', () => ({
  default: {
    push: vi.fn(),
  },
}));

describe('useInvitationValidation', () => {
  const mockSetInvitationId = vi.fn();
  const mockValidateInvitationFn = vi.fn();
  let originalSearch: string;

  beforeEach(() => {
    vi.clearAllMocks();
    originalSearch = globalThis.location.search;
  });

  afterEach(() => {
    globalThis.history.replaceState({}, '', originalSearch || globalThis.location.pathname);
  });

  it('should validate invitation when invitation ID is in URL', async () => {
    globalThis.history.pushState({}, '', '?invitation=test-invite-id');
    mockValidateInvitationFn.mockResolvedValue({ uuid: 'test-uuid' });

    const { result } = renderHook(() =>
      useInvitationValidation({
        validateInvitationFn: mockValidateInvitationFn,
        setInvitationId: mockSetInvitationId,
      }),
    );

    expect(result.current.invitationValidation.isLoading).toBe(true);

    await waitFor(
      () => {
        expect(mockValidateInvitationFn).toHaveBeenCalledWith('test-invite-id');
        expect(mockSetInvitationId).toHaveBeenCalledWith('test-invite-id');
        expect(result.current.invitationValidation.isValid).toBe(true);
        expect(result.current.invitationValidation.isLoading).toBe(false);
      },
      { timeout: 3000 },
    );
  });

  it('should handle validation errors', async () => {
    globalThis.history.pushState({}, '', '?invitation=invalid-invite');
    const mockError = new Error('Invalid invitation');
    mockValidateInvitationFn.mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useInvitationValidation({
        validateInvitationFn: mockValidateInvitationFn,
        setInvitationId: mockSetInvitationId,
      }),
    );

    await waitFor(() => {
      expect(errorService.reportError).toHaveBeenCalledWith(mockError);
      expect(result.current.invitationValidation.isValid).toBe(false);
      expect(result.current.invitationValidation.isLoading).toBe(false);
    });
  });

  it('should allow manual validation via validateInvitation function', async () => {
    globalThis.history.pushState({}, '', '?invitation=initial-invite');
    mockValidateInvitationFn.mockResolvedValue({ uuid: 'initial-uuid' });

    const { result } = renderHook(() =>
      useInvitationValidation({
        validateInvitationFn: mockValidateInvitationFn,
        setInvitationId: mockSetInvitationId,
      }),
    );

    await waitFor(() => {
      expect(result.current.invitationValidation.isLoading).toBe(false);
      expect(result.current.invitationValidation.isValid).toBe(true);
    });

    vi.clearAllMocks();
    mockValidateInvitationFn.mockResolvedValue({ uuid: 'manual-uuid' });

    await act(async () => {
      await result.current.validateInvitation('manual-invite-id');
    });

    await waitFor(() => {
      expect(mockValidateInvitationFn).toHaveBeenCalledWith('manual-invite-id');
      expect(mockSetInvitationId).toHaveBeenCalledWith('manual-invite-id');
      expect(result.current.invitationValidation.isValid).toBe(true);
    });
  });
});
