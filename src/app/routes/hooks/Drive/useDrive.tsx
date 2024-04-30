import { useEffect, useState } from 'react';
import navigationService from '../../../core/services/navigation.service';

const useDriveNavigation = () => {
  const pathname = navigationService.history.location.pathname;
  const [isFolderView, setIsFolderView] = useState(false);
  const [isFileView, setIsFileView] = useState(false);
  const [itemUuid, setItemUuid] = useState<string>();

  useEffect(() => {
    const currentIsFolderView = navigationService.isCurrentPath('folder');
    const currentIsFileView = navigationService.isCurrentPath('file');
    const currentUuid = navigationService.getUuid();

    setIsFolderView(currentIsFolderView);
    setIsFileView(currentIsFileView);
    setItemUuid(currentUuid);
  }, [pathname]);

  return { isFolderView, isFileView, itemUuid };
};

export default useDriveNavigation;
