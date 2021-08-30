import { Workspace } from '../models/enums';
import { StoragePlan } from '../models/interfaces';
import httpService from './http.service';

const fetchIndividualPlan = async (): Promise<StoragePlan | null> => {
  const response = await httpService.get<StoragePlan | null>('/api/plan/individual');

  return response;
};

const fetchTeamPlan = async (): Promise<StoragePlan | null> => {
  const response = await httpService.get<StoragePlan | null>('/api/plan/team', { authWorkspace: Workspace.Personal });

  return response;
};

const planService = {
  fetchIndividualPlan,
  fetchTeamPlan,
};

export default planService;
