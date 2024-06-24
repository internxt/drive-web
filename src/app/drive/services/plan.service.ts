import httpService from '../../core/services/http.service';
import { Workspace } from '../../core/types';
import { StoragePlan } from '../types';

const fetchIndividualPlan = async (): Promise<StoragePlan | null> => {
  const response = await httpService.get<StoragePlan | null>('/api/plan/individual', {
    authWorkspace: Workspace.Individuals,
  });

  return response;
};

const fetchBusinessPlan = async (): Promise<StoragePlan | null> => {
  const response = await httpService.get<StoragePlan | null>('/api/plan/business', {
    authWorkspace: Workspace.Individuals,
  });

  return response;
};

const fetchTeamPlan = async (): Promise<StoragePlan | null> => {
  const response = await httpService.get<StoragePlan | null>('/api/plan/team', {
    authWorkspace: Workspace.Individuals,
  });

  return response;
};

const planService = {
  fetchIndividualPlan,
  fetchBusinessPlan,
  fetchTeamPlan,
};

export default planService;
