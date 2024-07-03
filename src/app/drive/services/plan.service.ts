import httpService from '../../core/services/http.service';
import { Workspace } from '../../core/types';
import { StoragePlan } from '../types';

const fetchIndividualPlan = async (): Promise<StoragePlan | null> => {
  const response = await httpService.get<StoragePlan | null>('/plan/individual', {
    authWorkspace: Workspace.Individuals,
  });

  return response;
};

const fetchTeamPlan = async (): Promise<StoragePlan | null> => {
  const response = await httpService.get<StoragePlan | null>('/plan/team', {
    authWorkspace: Workspace.Individuals,
  });

  return response;
};

const planService = {
  fetchIndividualPlan,
  fetchTeamPlan,
};

export default planService;
