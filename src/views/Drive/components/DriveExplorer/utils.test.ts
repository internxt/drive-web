import { describe, expect, test, vi, beforeEach } from 'vitest';
import { shareItemWithTeamV2 } from './utils';
import { DriveItemData } from 'app/drive/types';
import { Role } from '@internxt/sdk/dist/drive/share/types';
import errorService from 'services/error.service';
import workspacesService from 'services/workspace.service';

describe('shareItemWithTeamV2', () => {
  const mockWorkspaceId = 'workspace-123';
  const mockTeamId = 'team-456';
  const mockRole: Role = {
    id: 'role-789',
    name: 'Editor',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };
  const mockDriveItem: DriveItemData = {
    uuid: 'item-uuid-123',
    id: 1,
    name: 'Test Folder',
    plainName: 'Test Folder',
    type: 'folder',
    isFolder: true,
    updatedAt: '2024-01-01',
    createdAt: '2024-01-01',
    size: BigInt(0),
  } as DriveItemData;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When sharing item with team fails, then should return false', async () => {
    // Arrange
    const mockError = new Error('Failed to share item');
    vi.spyOn(workspacesService, 'shareItemWithTeam').mockRejectedValue(mockError);
    const reportErrorSpy = vi.spyOn(errorService, 'reportError').mockResolvedValue();

    // Act
    const result = await shareItemWithTeamV2(mockWorkspaceId, mockDriveItem, mockTeamId, mockRole);

    // Assert
    expect(result).toBe(false);
    expect(reportErrorSpy).toHaveBeenCalledWith(mockError);
  });
});
