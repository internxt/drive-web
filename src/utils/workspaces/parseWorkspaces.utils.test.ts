import { PendingWorkspace, WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { describe, expect, test } from 'vitest';
import { parsePendingWorkspaces, parseWorkspaces } from './parseWorkspaces.utils';

const buildWorkspaceData = (overrides?: Partial<WorkspaceData['workspace']>): WorkspaceData => ({
  workspace: {
    id: 'workspace-uuid',
    name: 'Test Workspace',
    avatar: 'https://example.com/avatar.png',
    ...overrides,
  } as WorkspaceData['workspace'],
  workspaceUser: {} as WorkspaceData['workspaceUser'],
});

const buildPendingWorkspace = (overrides?: Partial<PendingWorkspace>): PendingWorkspace =>
  ({
    id: 'pending-uuid',
    name: 'Pending Workspace',
    ...overrides,
  }) as PendingWorkspace;

describe('Parsing Workspaces', () => {
  test('When given a list of workspaces, then maps them to Workspace shape correctly', () => {
    const input = [buildWorkspaceData()];
    const result = parseWorkspaces(input);

    expect(result).toEqual([
      {
        name: 'Test Workspace',
        uuid: 'workspace-uuid',
        type: 'Business',
        avatar: 'https://example.com/avatar.png',
      },
    ]);
  });

  test('When given multiple workspaces, then all are mapped', () => {
    const input = [buildWorkspaceData({ id: 'id-1', name: 'WS 1' }), buildWorkspaceData({ id: 'id-2', name: 'WS 2' })];
    const result = parseWorkspaces(input);

    expect(result).toHaveLength(2);
    expect(result[0].uuid).toBe('id-1');
    expect(result[1].uuid).toBe('id-2');
  });

  test('When given an empty array, then returns an empty array', () => {
    const result = parseWorkspaces([]);
    expect(result).toEqual([]);
  });

  test('When mapping, then type is always Business', () => {
    const result = parseWorkspaces([buildWorkspaceData()]);
    expect(result[0].type).toBe('Business');
  });
});

describe('Parsing Pending Workspaces', () => {
  test('When given a list of pending workspaces, then maps them to Workspace shape correctly', () => {
    const input = [buildPendingWorkspace()];
    const result = parsePendingWorkspaces(input);

    expect(result).toEqual([
      {
        name: 'Pending Workspace',
        uuid: 'pending-uuid',
        type: 'Business',
        isPending: true,
        avatar: null,
      },
    ]);
  });

  test('When given multiple pending workspaces, then all are mapped', () => {
    const input = [
      buildPendingWorkspace({ id: 'p-1', name: 'Pending 1' }),
      buildPendingWorkspace({ id: 'p-2', name: 'Pending 2' }),
    ];
    const result = parsePendingWorkspaces(input);

    expect(result).toHaveLength(2);
    expect(result[0].uuid).toBe('p-1');
    expect(result[1].uuid).toBe('p-2');
  });

  test('When given an empty array, then returns an empty array', () => {
    const result = parsePendingWorkspaces([]);
    expect(result).toEqual([]);
  });

  test('When mapping, then all should be marked as pending', () => {
    const result = parsePendingWorkspaces([buildPendingWorkspace()]);
    expect(result[0].isPending).toBe(true);
    expect(result[0].avatar).toBeNull();
  });
});
