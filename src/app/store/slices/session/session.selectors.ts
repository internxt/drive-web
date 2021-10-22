import { RootState } from '../..';
import { Workspace } from '../../../core/types';

export const sessionSelectors = {
  isTeam: (state: RootState): boolean => state.session.workspace === Workspace.Business,
};
