import { useMemo, useState } from 'react';
import { AppView } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import { PreviewFileItem } from 'app/share/types';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import navigationService from 'services/navigation.service';
import { FileViewerNavigation } from '../types';

interface UseFileViewerNavigationProps {
  initialFile: PreviewFileItem;
  folderItems?: DriveItemData[];
}

export const useFileViewerNavigation = ({ initialFile, folderItems }: UseFileViewerNavigationProps) => {
  const [currentFile, setCurrentFile] = useState<PreviewFileItem>(initialFile);
  const isRecentsView = navigationService.isCurrentPath(AppView.Recents);
  const listedItems = useAppSelector((state: RootState) =>
    isRecentsView ? state.storage.recents : state.storage.levels[initialFile.folderUuid],
  );

  const files = useMemo(
    () => (folderItems ?? listedItems ?? []).filter((item) => !item.isFolder) as PreviewFileItem[],
    [folderItems, listedItems],
  );
  const currentIndex = files.findIndex((item) => item.id === currentFile.id);
  const isCurrentFileListed = currentIndex !== -1;

  const hasPrevious = isCurrentFileListed && currentIndex > 0;
  const hasNext = isCurrentFileListed && currentIndex < files.length - 1;

  const navigation = useMemo((): FileViewerNavigation => {
    const goToPrevious = () => {
      if (hasPrevious) setCurrentFile(files[currentIndex - 1]);
    };

    const goToNext = () => {
      if (hasNext) setCurrentFile(files[currentIndex + 1]);
    };

    return { hasPrevious, hasNext, goToPrevious, goToNext };
  }, [files, currentIndex, hasPrevious, hasNext]);

  return { currentFile, setCurrentFile, navigation };
};
