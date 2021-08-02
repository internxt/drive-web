import { Workspace } from '../models/enums';
import { AppDispatch } from '../store';
import { storageActions, storageThunks } from '../store/slices/storage';
import localStorageService from './localStorage.service';

export function loadDataAtChangeWorkspace(dispatch: AppDispatch, workspace: Workspace): void {
  const user = localStorageService.getUser();
  const team = localStorageService.getTeams();

  if (workspace === Workspace.Individual) {
    dispatch(storageThunks.fetchFolderContentThunk(user?.root_folder_id));
    const pathIndividual = {
      id: user.root_folder_id,
      name: 'Drive'
    };

    dispatch(storageActions.pathChangeWorkSpace(pathIndividual));

  } else {
    const pathBusiness = {
      id: team.root_folder_id,
      name: 'Drive'
    };

    dispatch(storageThunks.fetchFolderContentThunk(team.root_folder_id));
    dispatch(storageActions.pathChangeWorkSpace(pathBusiness));
  }
}