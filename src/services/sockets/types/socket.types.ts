import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { DriveItemData } from 'app/drive/types';

export const SOCKET_EVENTS = {
  FILE_CREATED: 'FILE_CREATED',
  PLAN_UPDATED: 'PLAN_UPDATED',
} as const;

interface BaseEventData {
  email: UserSettings['email'];
  clientId: string;
  userId: UserSettings['userId'];
}

interface FileCreatedEvent extends BaseEventData {
  event: typeof SOCKET_EVENTS.FILE_CREATED;
  payload: DriveItemData;
}

interface PlanUpdatedEvent extends BaseEventData {
  event: typeof SOCKET_EVENTS.PLAN_UPDATED;
  payload: {
    maxSpaceBytes: number;
  };
}

export type EventData = FileCreatedEvent | PlanUpdatedEvent;
