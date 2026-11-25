import { Redirect } from 'react-router-dom';
import { AppView } from 'app/core/types';
import { useAppSelector } from 'app/store/hooks';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import configService from 'services/config.service';
import PhotosView from './PhotosView';

const PhotosPage = (): JSX.Element => {
  const workspaceUuid = useAppSelector(workspacesSelectors.getSelectedWorkspace)?.workspaceUser.workspaceId;

  if (workspaceUuid) {
    const drivePath = configService.getViewConfig({ id: AppView.Drive })?.path ?? '/';
    return <Redirect to={{ pathname: drivePath, search: `workspaceid=${workspaceUuid}` }} />;
  }

  return <PhotosView />;
};

export default PhotosPage;
