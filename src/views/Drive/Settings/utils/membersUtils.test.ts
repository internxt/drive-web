import { describe, it, expect } from 'vitest';
import { getMemberRole, searchMembers, searchMembersEmail } from './membersUtils';
import { WorkspaceUser } from '@internxt/sdk/dist/workspaces';

describe('membersUtils', () => {
  describe('searchMembers', () => {
    it('should filter members by name', () => {
      const members: WorkspaceUser[] = [
        { member: { name: 'John', lastname: 'Doe', email: 'john@example.com' } } as WorkspaceUser,
        { member: { name: 'Jane', lastname: 'Smith', email: 'jane@example.com' } } as WorkspaceUser,
        { member: { name: 'Bob', lastname: 'Johnson', email: 'bob@example.com' } } as WorkspaceUser,
      ];

      expect(searchMembers(members, 'John')).toEqual([members[0], members[2]]);
      expect(searchMembers(members, 'jane')).toEqual([members[1]]);
      expect(searchMembers(members, 'xyz')).toEqual([]);
      expect(searchMembers(null, 'John')).toEqual([]);
    });
  });

  describe('searchMembersEmail', () => {
    it('should filter members by email', () => {
      const members: WorkspaceUser[] = [
        { member: { name: 'John', lastname: 'Doe', email: 'john@example.com' } } as WorkspaceUser,
        { member: { name: 'Jane', lastname: 'Smith', email: 'jane@test.com' } } as WorkspaceUser,
      ];

      expect(searchMembersEmail(members, 'john')).toEqual([members[0]]);
      expect(searchMembersEmail(members, 'test')).toEqual([members[1]]);
      expect(searchMembersEmail(members, 'notfound')).toEqual([]);
      expect(searchMembersEmail(null, 'test')).toEqual([]);
    });
  });

  describe('getMemberRole', () => {
    it('should determine correct role based on member properties', () => {
      expect(getMemberRole({ isOwner: true, isManager: true, deactivated: false } as WorkspaceUser)).toBe('owner');
      expect(getMemberRole({ isOwner: false, isManager: true, deactivated: false } as WorkspaceUser)).toBe('manager');
      expect(getMemberRole({ isOwner: false, isManager: false, deactivated: true } as WorkspaceUser)).toBe(
        'deactivated',
      );
      expect(getMemberRole({ isOwner: true, isManager: false, deactivated: true } as WorkspaceUser)).toBe(
        'deactivated',
      );
      expect(getMemberRole({ isOwner: false, isManager: false, deactivated: false } as WorkspaceUser)).toBe('member');
    });
  });
});
