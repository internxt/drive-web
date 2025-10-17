import { WorkspaceUser } from '@internxt/sdk/dist/workspaces';

const searchMembers = (membersList: WorkspaceUser[] | null, searchString: string) => {
  const escapedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedSearchString, 'i');

  const resultados = membersList?.filter((obj) => {
    const fullName = obj.member.name + ' ' + obj.member.lastname;
    return regex.test(fullName);
  });

  return resultados || [];
};

const searchMembersEmail = (membersList: WorkspaceUser[] | null, searchString: string) => {
  const escapedSearchString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedSearchString, 'i');

  const resultados = membersList?.filter((obj) => {
    return regex.test(obj.member.email);
  });

  return resultados || [];
};

const getMemberRole = (member: WorkspaceUser) => {
  const isOwner = member.isOwner;
  const isManager = member.isManager;
  const isDeactivated = member.deactivated;

  if (isDeactivated) {
    return 'deactivated';
  } else if (isOwner) {
    return 'owner';
  } else if (isManager) {
    return 'manager';
  } else {
    return 'member';
  }
};

export { getMemberRole, searchMembers, searchMembersEmail };
