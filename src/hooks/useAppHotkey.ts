import { Options, useHotkeys } from 'react-hotkeys-hook';
import { useAppSelector } from 'app/store/hooks';
import { uiSelectors } from 'app/store/slices/ui';

/**
 * Every keyboard shortcut of the app, so clashes between them are easy to spot.
 */
export const HOTKEYS = {
  createFolder: 'shift+f',
  toggleFavorite: 'f',
  rename: 'r',
  moveToTrash: 'backspace',
  nextFile: 'right',
  previousFile: 'left',
  focusSearch: ['Meta+F', 'Control+F'],
  confirm: 'Enter',
  close: 'Esc',
} as const;

export type AppHotkey = (typeof HOTKEYS)[keyof typeof HOTKEYS];

interface UseAppHotkeyOptions {
  enabled?: boolean;
  /** Keep the shortcut working while a dialog is open, for shortcuts that belong to the dialog itself. */
  ignoreDialogs?: boolean;
  enableOnFormTags?: Options['enableOnFormTags'];
}

export const useAppHotkey = (
  hotkey: AppHotkey,
  onPressed: (event: KeyboardEvent) => void,
  { enabled = true, ignoreDialogs = false, enableOnFormTags }: UseAppHotkeyOptions = {},
): void => {
  const isSomeDialogOpen = useAppSelector(uiSelectors.isSomeDialogOpen);

  useHotkeys(hotkey, (event) => onPressed(event), {
    enabled: enabled && (ignoreDialogs || !isSomeDialogOpen),
    enableOnFormTags,
    preventDefault: true,
  });
};
