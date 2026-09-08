import { useHotkeys } from 'react-hotkeys-hook';
import { useAppDispatch } from 'app/store/hooks';
import { DriveItemData } from 'app/drive/types';
import { toggleFavoriteThunk } from 'views/Favorites/store/toggleFavoriteThunk';

interface UseToggleFavoriteHotkeyOptions {
  enabled: boolean;
  selectedItems: DriveItemData[];
}

export const useToggleFavoriteHotkey = ({ enabled, selectedItems }: UseToggleFavoriteHotkeyOptions): void => {
  const dispatch = useAppDispatch();

  useHotkeys(
    'f',
    (e) => {
      if (e.shiftKey) return;
      e.preventDefault();
      if (enabled && selectedItems.length === 1) {
        dispatch(toggleFavoriteThunk(selectedItems));
      }
    },
    [enabled, selectedItems, dispatch],
  );
};
