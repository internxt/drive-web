/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { DriveItemData } from '../../drive/types';
import { ActionDialog, DialogManagerProvider } from './ActionDialogManager.context';
import { useActionDialog } from './useActionDialog';

describe('useActionDialog custom hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <DialogManagerProvider>{children}</DialogManagerProvider>;

  it('should open and close a dialog', () => {
    const { result } = renderHook(() => useActionDialog(), { wrapper });

    expect(result.current.isDialogOpen(ActionDialog.MoveItem)).toBe(false);

    act(() => {
      result.current.openDialog(ActionDialog.MoveItem);
    });

    expect(result.current.isDialogOpen(ActionDialog.MoveItem)).toBe(true);

    act(() => {
      result.current.closeDialog(ActionDialog.MoveItem);
    });

    expect(result.current.isDialogOpen(ActionDialog.MoveItem)).toBe(false);
  });

  it('should store and retrieve dialog data', () => {
    const { result } = renderHook(() => useActionDialog(), { wrapper });

    const mockData = { item: {} as DriveItemData, name: 'Test Item' };

    act(() => {
      result.current.openDialog(ActionDialog.MoveItem, { data: mockData });
    });

    expect(result.current.isDialogOpen(ActionDialog.MoveItem)).toBe(true);
    expect(result.current.getDialogData(ActionDialog.MoveItem)).toEqual(mockData);

    act(() => {
      result.current.closeDialog(ActionDialog.MoveItem);
    });

    expect(result.current.isDialogOpen(ActionDialog.MoveItem)).toBe(false);
    expect(result.current.getDialogData(ActionDialog.MoveItem)).toBe(null);
  });

  it('should close all dialogs when opening a new one with closeAllDialogsFirst option', () => {
    const { result } = renderHook(() => useActionDialog(), { wrapper });

    act(() => {
      result.current.openDialog(ActionDialog.MoveItem);
      result.current.openDialog(ActionDialog.createFolder);
    });

    expect(result.current.isDialogOpen(ActionDialog.MoveItem)).toBe(true);
    expect(result.current.isDialogOpen(ActionDialog.createFolder)).toBe(true);

    act(() => {
      result.current.openDialog(ActionDialog.fileViewer, { closeAllDialogsFirst: true });
    });

    expect(result.current.isDialogOpen(ActionDialog.MoveItem)).toBe(false);
    expect(result.current.isDialogOpen(ActionDialog.createFolder)).toBe(false);
    expect(result.current.isDialogOpen(ActionDialog.fileViewer)).toBe(true);
  });
});
