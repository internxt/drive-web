import { beforeEach, describe, expect, vi, test } from 'vitest';
import { EventHandler } from './event-handler.service';
import { SOCKET_EVENTS, EventData } from './types/socket.types';
import { store } from 'app/store';
import { planActions, planThunks } from 'app/store/slices/plan';
import { storageActions } from 'app/store/slices/storage';

vi.mock('app/store', () => ({
  store: {
    dispatch: vi.fn(),
  },
}));

vi.mock('app/store/slices/plan', () => ({
  planActions: {
    updatePlanLimit: vi.fn((limit: number) => ({ type: 'plan/updatePlanLimit', payload: limit })),
  },
  planThunks: {
    fetchLimitThunk: vi.fn(() => ({ type: 'plan/fetchLimitThunk' })),
    fetchUsageThunk: vi.fn(() => ({ type: 'plan/fetchUsageThunk' })),
    fetchSubscriptionThunk: vi.fn(() => ({ type: 'plan/fetchSubscriptionThunk' })),
    fetchBusinessLimitUsageThunk: vi.fn(() => ({ type: 'plan/fetchBusinessLimitUsageThunk' })),
  },
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    pushItems: vi.fn((payload) => ({ type: 'storage/pushItems', payload })),
  },
}));

describe('Event Handler', () => {
  let eventHandler: EventHandler;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandler = new EventHandler();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Plan updated', () => {
    test('When the event contains the new plan limit, then it should update plan limit', () => {
      const eventData: EventData = {
        event: SOCKET_EVENTS.PLAN_UPDATED,
        email: 'test@example.com',
        clientId: 'client-123',
        userId: 'user-123',
        payload: {
          maxSpaceBytes: 1000000,
        },
      };

      eventHandler.onPlanUpdated(eventData);

      expect(planActions.updatePlanLimit).toHaveBeenCalledWith(eventData.payload.maxSpaceBytes);
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'plan/updatePlanLimit',
        payload: 1000000,
      });
    });

    test('When there is no new limit, then it should fetch the limit', () => {
      const eventData: EventData = {
        event: SOCKET_EVENTS.PLAN_UPDATED,
        email: 'test@example.com',
        clientId: 'client-123',
        userId: 'user-123',
        payload: {
          maxSpaceBytes: 0,
        },
      };

      eventHandler.onPlanUpdated(eventData);

      expect(store.dispatch).toHaveBeenCalledWith(planThunks.fetchLimitThunk());
    });
  });

  describe('Create File', () => {
    const mockFileItem = {
      id: 1,
      fileId: 'file-123',
      type: 'file' as const,
      name: 'test.txt',
      size: 1024,
      folderUuid: 'folder-123',
      uuid: 'uuid-123',
      bucket: 'bucket-1',
      createdAt: '2024-01-01',
      created_at: '2024-01-01',
      deleted: false,
      deletedAt: null,
      encryptVersion: '03-aes',
      encrypt_version: '03-aes',
      folderId: 1,
      folder_id: 1,
      modificationTime: '2024-01-01',
      updatedAt: '2024-01-01',
      updated_at: '2024-01-01',
      userId: 1,
      plainName: 'test.txt',
      removed: false,
      removed_at: null,
      status: 'EXISTS' as const,
    };

    test('When a file is created, then it should push item to storage', () => {
      const eventData: EventData = {
        event: SOCKET_EVENTS.FILE_CREATED,
        email: 'test@example.com',
        clientId: 'client-123',
        userId: 'user-123',
        payload: mockFileItem,
      };

      eventHandler.onFileCreated(eventData, 'folder-123');

      expect(storageActions.pushItems).toHaveBeenCalledWith({
        updateRecents: true,
        folderIds: ['folder-123'],
        items: [mockFileItem],
      });
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'storage/pushItems',
        payload: {
          updateRecents: true,
          folderIds: ['folder-123'],
          items: [mockFileItem],
        },
      });
    });

    test('When a file is created but the folder id does not match, then should not push the item', () => {
      const eventData: EventData = {
        event: SOCKET_EVENTS.FILE_CREATED,
        email: 'test@example.com',
        clientId: 'client-123',
        userId: 'user-123',
        payload: mockFileItem,
      };

      eventHandler.onFileCreated(eventData, 'different-folder-123');

      expect(consoleLogSpy).toHaveBeenCalledWith('[Event Handler] Handling created file:', {
        itemFolderId: 'folder-123',
        currentFolderId: 'different-folder-123',
        match: false,
      });
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });
});
