import { ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import uiReducer, { uiActions } from 'app/store/slices/ui';
import { AppHotkey, HOTKEYS, useAppHotkey } from './useAppHotkey';

const renderShortcut = (
  hotkey: AppHotkey,
  options?: Parameters<typeof useAppHotkey>[2],
  onPressed: (event: KeyboardEvent) => void = vi.fn(),
) => {
  const store = configureStore({ reducer: { ui: uiReducer } });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const view = renderHook(({ action }) => useAppHotkey(hotkey, action, options), {
    wrapper,
    initialProps: { action: onPressed },
  });

  return { store, onPressed, rerender: view.rerender };
};

const pressF = (options: Record<string, unknown> = {}, target: Element = document.body) =>
  fireEvent.keyDown(target, { key: 'f', code: 'KeyF', keyCode: 70, ...options });

const openADialog = (store: ReturnType<typeof renderShortcut>['store']) =>
  act(() => {
    store.dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  });

describe('App keyboard shortcuts', () => {
  test('When the shortcut is pressed, then its action runs and the key does nothing else', () => {
    const { onPressed } = renderShortcut(HOTKEYS.toggleFavorite);

    const wasNotPrevented = pressF();

    expect(onPressed).toHaveBeenCalledTimes(1);
    expect(wasNotPrevented).toBe(false);
  });

  test('When the shortcut is disabled, then pressing it does nothing', () => {
    const { onPressed } = renderShortcut(HOTKEYS.toggleFavorite, { enabled: false });

    const wasNotPrevented = pressF();

    expect(onPressed).not.toHaveBeenCalled();
    expect(wasNotPrevented).toBe(true);
  });

  test('When a dialog is open, then the shortcut does nothing until it closes', () => {
    const { store, onPressed } = renderShortcut(HOTKEYS.toggleFavorite);
    openADialog(store);

    pressF();
    expect(onPressed).not.toHaveBeenCalled();

    act(() => {
      store.dispatch(uiActions.setIsDeleteItemsDialogOpen(false));
    });
    pressF();
    expect(onPressed).toHaveBeenCalledTimes(1);
  });

  test('When a dialog is open and the shortcut belongs to that dialog, then it still works', () => {
    const { store, onPressed } = renderShortcut(HOTKEYS.toggleFavorite, { ignoreDialogs: true });
    openADialog(store);

    pressF();

    expect(onPressed).toHaveBeenCalledTimes(1);
  });

  test('When the user is typing in a field, then the shortcut does nothing', () => {
    const { onPressed } = renderShortcut(HOTKEYS.toggleFavorite);
    const input = document.createElement('input');
    document.body.appendChild(input);

    pressF({}, input);

    expect(onPressed).not.toHaveBeenCalled();
    input.remove();
  });

  test('When the shortcut is allowed in fields and the user is typing in one, then it still works', () => {
    const { onPressed } = renderShortcut(HOTKEYS.toggleFavorite, { enableOnFormTags: ['input'] });
    const input = document.createElement('input');
    document.body.appendChild(input);

    pressF({}, input);

    expect(onPressed).toHaveBeenCalledTimes(1);
    input.remove();
  });

  test('When the shortcut and its Shift variant are both in use, then each key combination runs only its own action', () => {
    const toggleFavorite = renderShortcut(HOTKEYS.toggleFavorite);
    const createFolder = renderShortcut(HOTKEYS.createFolder);

    pressF({ key: 'F', shiftKey: true });
    expect(createFolder.onPressed).toHaveBeenCalledTimes(1);
    expect(toggleFavorite.onPressed).not.toHaveBeenCalled();

    pressF();
    expect(toggleFavorite.onPressed).toHaveBeenCalledTimes(1);
    expect(createFolder.onPressed).toHaveBeenCalledTimes(1);
  });

  test('When the action changes after rendering, then pressing the shortcut runs the latest one', () => {
    const firstAction = vi.fn();
    const latestAction = vi.fn();
    const { rerender } = renderShortcut(HOTKEYS.toggleFavorite, {}, firstAction);

    rerender({ action: latestAction });
    pressF();

    expect(firstAction).not.toHaveBeenCalled();
    expect(latestAction).toHaveBeenCalledTimes(1);
  });
});
