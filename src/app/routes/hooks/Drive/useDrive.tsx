import { useEffect, useState } from 'react';
import navigationService from '../../../core/services/navigation.service';

const useDriveNavigation = () => {
  const pathname = navigationService.history.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const [isFolderView, setIsFolderView] = useState(false);
  const [isFileView, setIsFileView] = useState(false);
  const [itemUuid, setItemUuid] = useState<string>();
  const [workspaceUuid, setWorkspaceUuid] = useState<string>();

  useEffect(() => {
    const currentIsFolderView = navigationService.isCurrentPath('folder');
    const currentIsFileView = navigationService.isCurrentPath('file');
    const currentUuid = navigationService.getUuid();
    const currentWorkspaceUuid = params.getAll('workspaceid');

    setIsFolderView(currentIsFolderView);
    setIsFileView(currentIsFileView);
    setItemUuid(currentUuid);
    setWorkspaceUuid(currentWorkspaceUuid[0]);
  }, [pathname]);

  return { isFolderView, isFileView, itemUuid, workspaceUuid };
};

export default useDriveNavigation;
