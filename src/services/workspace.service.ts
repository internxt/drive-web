import { Workspace } from '../models/enums';
import { TeamsSettings, UserSettings } from '../models/interfaces';
import { AppDispatch } from '../store';
import { storageActions, storageThunks } from '../store/slices/storage';
import localStorageService from './local-storage.service';

export function loadDataAtChangeWorkspace(dispatch: AppDispatch, workspace: Workspace): void {
  const user = localStorageService.getUser() as UserSettings;
  const team = localStorageService.getTeams() as TeamsSettings;
  const isTeam = workspace === Workspace.Business;
  const rootFolderId = isTeam ? team.root_folder_id : user.root_folder_id;

  dispatch(storageThunks.fetchFolderContentThunk(rootFolderId));
  dispatch(storageThunks.fetchRecentsThunk());
  dispatch(storageActions.pathChangeWorkSpace({
    id: rootFolderId,
    name: 'Drive'
  }));
}