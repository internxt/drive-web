import axios from 'axios';
import { StoragePlan } from '../models/interfaces';

const fetchIndividualPlan = async (): Promise<StoragePlan | null> => {
  const response = await axios.get('/api/plan/individual');

  return response.data;
};

const fetchTeamPlan = async (): Promise<StoragePlan | null> => {
  const response = await axios.get('/api/plan/team');

  return response.data;
};

const planService = {
  fetchIndividualPlan,
  fetchTeamPlan
};

export default planService;