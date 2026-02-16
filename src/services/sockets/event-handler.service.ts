import { planActions, planThunks } from 'app/store/slices/plan';
import { EventData, SOCKET_EVENTS } from './types/socket.types';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';

export class EventHandler {
  public onPlanUpdated(data: EventData) {
    if (data.event !== SOCKET_EVENTS.PLAN_UPDATED) return;
    const newLimit = data.payload?.maxSpaceBytes;
    console.log('[Event Handler] Updating plan limit: ', newLimit);

    if (newLimit) {
      store.dispatch(planActions.updatePlanLimit(Number(newLimit)));
    } else {
      store.dispatch(planThunks.fetchLimitThunk());
    }
  }

  public onFileCreated(data: EventData, currentFolderId: string) {
    if (data.event !== SOCKET_EVENTS.FILE_CREATED) return;
    const item = data.payload;

    console.log('[Event Handler] Handling created file:', {
      itemFolderId: item.folderUuid,
      currentFolderId,
      match: item.folderUuid === currentFolderId,
    });

    if (item.folderUuid !== currentFolderId) return;

    store.dispatch(
      storageActions.pushItems({
        updateRecents: true,
        folderIds: [item.folderUuid],
        items: [item],
      }),
    );
  }
}

export const eventHandler = new EventHandler();
