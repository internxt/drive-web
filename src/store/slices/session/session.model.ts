import { Workspace } from '../../../models/enums';

export interface SessionState {
  hasConnection: boolean;
  workspace: Workspace;
}