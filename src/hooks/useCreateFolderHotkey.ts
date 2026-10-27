import { useHotkeys } from 'react-hotkeys-hook';

interface UseCreateFolderHotkeyOptions {
  enabled: boolean;
  onCreateFolder: () => void;
}

export const useCreateFolderHotkey = ({ enabled, onCreateFolder }: UseCreateFolderHotkeyOptions): void => {
  useHotkeys(
    'shift+f',
    (e) => {
      e.preventDefault();
      onCreateFolder();
    },
    { enabled },
    [onCreateFolder],
  );
};
