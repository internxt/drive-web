import { useEffect, useState } from 'react';
import navigationService from '../../../core/services/navigation.service';

const useDriveNavigation = () => {
  const pathname = navigationService.history.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const [isFolderView, setIsFolderView] = useState(false);
  const [isFileView, setIsFileView] = useState(false);
  const [itemUuid, setItemUuid] = useState<string>();
  const [workspaceUuid, setWorkspaceUuid] = useState<string>();
  const [isOverviewSubsection, setIsOverviewSubsection] = useState(false);

  useEffect(() => {
    const currentIsFolderView = navigationService.isCurrentPath('folder');
    const currentIsFileView = navigationService.isCurrentPath('file');
    const currentUuid = navigationService.getUuid();
    const currentWorkspaceUuid = params.getAll('workspaceid');
    const currentSubsectionParams = params.getAll('subsection');
    const isOverview = currentSubsectionParams[0] === 'overview';

    setIsFolderView(currentIsFolderView);
    setIsFileView(currentIsFileView);
    setItemUuid(currentUuid);
    setWorkspaceUuid(currentWorkspaceUuid[0]);
    setIsOverviewSubsection(isOverview);
  }, [pathname]);

  useEffect(() => {
    const currentWorkspaceUuid = params.getAll('workspaceid');
    setWorkspaceUuid(currentWorkspaceUuid[0]);
  }, [params]);

  return { isFolderView, isFileView, itemUuid, workspaceUuid, isOverviewSubsection };
};

export default useDriveNavigation;
