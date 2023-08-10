import { PrivateSharingRole } from '@internxt/sdk/dist/drive/share/types';
import { Role } from './types';

export const parseRolesFromBackend = (backendRoles: PrivateSharingRole[]): Role[] => {
  return backendRoles.map((role) => ({
    id: role.id,
    name: role.role,
  }));
};
