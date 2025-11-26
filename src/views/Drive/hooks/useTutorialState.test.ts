import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TaskStatus } from 'app/tasks/types';

vi.mock('app/store/hooks', () => ({
  useAppSelector: vi.fn(),
}));

vi.mock('app/tasks/hooks', () => ({
  useTaskManagerGetNotifications: vi.fn(),
}));

vi.mock('app/drive/services/new-storage.service', () => ({
  default: {
    hasUploadedFiles: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

vi.mock('services/env.service', () => ({
  default: {
    isProduction: vi.fn(),
    getVariable: vi.fn(),
  },
}));

import { useTutorialState } from './useTutorialState';
import { useAppSelector } from 'app/store/hooks';
import { useTaskManagerGetNotifications } from 'app/tasks/hooks';
import newStorageService from 'app/drive/services/new-storage.service';
import errorService from 'services/error.service';
import envService from 'services/env.service';

const mockUseAppSelector = useAppSelector as ReturnType<typeof vi.fn>;
const mockUseTaskManagerGetNotifications = useTaskManagerGetNotifications as ReturnType<typeof vi.fn>;
const mockHasUploadedFiles = newStorageService.hasUploadedFiles as ReturnType<typeof vi.fn>;
const mockReportError = errorService.reportError as ReturnType<typeof vi.fn>;
const mockIsProduction = envService.isProduction as ReturnType<typeof vi.fn>;

const createMockStore = () => {
  return configureStore({
    reducer: {
      user: (state = {}) => state,
    },
  });
};

const renderHookWithProvider = (hook: () => ReturnType<typeof useTutorialState>) => {
  const store = createMockStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store }, children);
  };
  return renderHook(hook, { wrapper });
};

describe('useTutorialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAppSelector.mockReturnValue(false);
    mockUseTaskManagerGetNotifications.mockReturnValue([]);
    mockHasUploadedFiles.mockResolvedValue({ hasUploadedFiles: false });
    mockIsProduction.mockReturnValue(true);
    mockReportError.mockImplementation(() => {});
  });

  it('initializes with correct default state', () => {
    const { result } = renderHookWithProvider(() => useTutorialState());

    expect(result.current).toMatchObject({
      hasAnyUploadedFile: undefined,
      currentTutorialStep: 0,
      showSecondTutorialStep: false,
      showTutorial: false,
    });
    expect(result.current.uploadFileButtonRef).toHaveProperty('current', null);
    expect(result.current.divRef).toHaveProperty('current', null);
    expect(typeof result.current.passToNextStep).toBe('function');
  });

  it('increments tutorial step with passToNextStep', () => {
    const { result } = renderHookWithProvider(() => useTutorialState());

    expect(result.current.currentTutorialStep).toBe(0);

    act(() => {
      result.current.passToNextStep();
    });

    expect(result.current.currentTutorialStep).toBe(1);

    act(() => {
      result.current.passToNextStep();
    });

    expect(result.current.currentTutorialStep).toBe(2);
  });

  it('shows tutorial when conditions are met', async () => {
    mockUseAppSelector.mockReturnValue(true);
    mockHasUploadedFiles.mockResolvedValue({ hasUploadedFiles: false });

    const { result } = renderHookWithProvider(() => useTutorialState());

    await waitFor(() => {
      expect(result.current.hasAnyUploadedFile).toBe(false);
    });

    expect(result.current.showTutorial).toBe(true);
  });

  it('hides tutorial when user has uploaded files', async () => {
    mockUseAppSelector.mockReturnValue(true);
    mockHasUploadedFiles.mockResolvedValue({ hasUploadedFiles: true });

    const { result } = renderHookWithProvider(() => useTutorialState());

    await waitFor(() => {
      expect(result.current.hasAnyUploadedFile).toBe(true);
    });

    expect(result.current.showTutorial).toBe(false);
  });

  it('hides tutorial when not signed today', () => {
    mockUseAppSelector.mockReturnValue(false);

    const { result } = renderHookWithProvider(() => useTutorialState());

    expect(result.current.showTutorial).toBe(false);
  });

  it('hides tutorial when not in production', async () => {
    mockUseAppSelector.mockReturnValue(true);
    mockIsProduction.mockReturnValue(false);
    mockHasUploadedFiles.mockResolvedValue({ hasUploadedFiles: false });

    const { result } = renderHookWithProvider(() => useTutorialState());

    await waitFor(() => {
      expect(result.current.hasAnyUploadedFile).toBe(false);
    });

    expect(result.current.showTutorial).toBe(false);
  });

  it('shows second tutorial step when upload succeeds', async () => {
    mockUseAppSelector.mockReturnValue(true);
    mockHasUploadedFiles.mockResolvedValue({ hasUploadedFiles: false });
    mockUseTaskManagerGetNotifications.mockReturnValue([{ status: TaskStatus.Success }]);

    const { result } = renderHookWithProvider(() => useTutorialState());

    await waitFor(() => {
      expect(result.current.hasAnyUploadedFile).toBe(false);
    });

    act(() => {
      result.current.passToNextStep();
    });

    await waitFor(() => {
      expect(result.current.showSecondTutorialStep).toBe(true);
    });
  });

  it('does not show second tutorial step when no success notification', async () => {
    mockUseAppSelector.mockReturnValue(true);
    mockHasUploadedFiles.mockResolvedValue({ hasUploadedFiles: false });
    mockUseTaskManagerGetNotifications.mockReturnValue([]);

    const { result } = renderHookWithProvider(() => useTutorialState());

    await waitFor(() => {
      expect(result.current.hasAnyUploadedFile).toBe(false);
    });

    act(() => {
      result.current.passToNextStep();
    });

    expect(result.current.showSecondTutorialStep).toBe(false);
  });

  it('shows tutorial with second step when showSecondTutorialStep is true', async () => {
    mockUseAppSelector.mockReturnValue(true);
    mockHasUploadedFiles.mockResolvedValue({ hasUploadedFiles: false });
    mockUseTaskManagerGetNotifications.mockReturnValue([{ status: TaskStatus.Success }]);

    const { result } = renderHookWithProvider(() => useTutorialState());

    await waitFor(() => {
      expect(result.current.hasAnyUploadedFile).toBe(false);
    });

    act(() => {
      result.current.passToNextStep();
    });

    await waitFor(() => {
      expect(result.current.showSecondTutorialStep).toBe(true);
      expect(result.current.showTutorial).toBe(true);
    });
  });

  it('handles hasUploadedFiles API error', async () => {
    mockUseAppSelector.mockReturnValue(true);
    const error = new Error('API Error');
    mockHasUploadedFiles.mockRejectedValue(error);

    const { result } = renderHookWithProvider(() => useTutorialState());

    await waitFor(() => {
      expect(mockReportError).toHaveBeenCalledWith(error);
    });

    expect(result.current.hasAnyUploadedFile).toBeUndefined();
  });

  it('does not call hasUploadedFiles when not signed today', () => {
    mockUseAppSelector.mockReturnValue(false);

    renderHookWithProvider(() => useTutorialState());

    expect(mockHasUploadedFiles).not.toHaveBeenCalled();
  });

  it('returns all expected properties with correct types', () => {
    const { result } = renderHookWithProvider(() => useTutorialState());

    expect(typeof result.current.hasAnyUploadedFile).toBe('undefined');
    expect(typeof result.current.currentTutorialStep).toBe('number');
    expect(typeof result.current.showSecondTutorialStep).toBe('boolean');
    expect(typeof result.current.showTutorial).toBe('boolean');
    expect(typeof result.current.passToNextStep).toBe('function');
    expect(typeof result.current.uploadFileButtonRef).toBe('object');
    expect(typeof result.current.divRef).toBe('object');

    const expectedProps = [
      'hasAnyUploadedFile',
      'currentTutorialStep',
      'showSecondTutorialStep',
      'uploadFileButtonRef',
      'divRef',
      'showTutorial',
      'passToNextStep',
    ];
    expectedProps.forEach((prop) => expect(result.current).toHaveProperty(prop));
  });
});
