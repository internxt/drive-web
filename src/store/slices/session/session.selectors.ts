import { RootState } from '../..';
import { Workspace } from '../../../models/enums';

export const sessionSelectors = {
  isTeam: (state: RootState): boolean => state.session.workspace === Workspace.Business,
};
