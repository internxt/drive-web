import { refreshFileThumbnailFromContent } from 'app/drive/services/thumbnail.service';
import { PreviewFileItem } from 'app/share/types';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import errorService from 'services/error.service';
import { isItemOwnedByCurrentUser } from 'views/Shared/utils/sharedViewUtils';

interface UseFileThumbnailRefreshProps {
  isSharedView?: boolean;
  isWorkspace: boolean;
}

export const useFileThumbnailRefresh = ({ isSharedView, isWorkspace }: UseFileThumbnailRefreshProps) => {
  const dispatch = useAppDispatch();
  const currentUserUuid = useAppSelector((state: RootState) => state.user.user?.uuid);

  const refreshThumbnail = async (file: PreviewFileItem, content: Blob): Promise<void> => {
    const isOwnedByCurrentUser = !isSharedView || isItemOwnedByCurrentUser(currentUserUuid, file.user?.uuid);
    if (!isOwnedByCurrentUser) return;

    await refreshFileThumbnailFromContent({ file, content, isWorkspace, dispatch }).catch(errorService.reportError);
  };

  return { refreshThumbnail };
};
