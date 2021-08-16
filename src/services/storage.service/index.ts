import fileService from '../file.service';
import folderService from '../folder.service';
import upload from './storage-upload.service';
import name from './storage-name.service';
import { DriveFileData, DriveFolderData, DriveItemData } from '../../models/interfaces';

export function deleteItems(items: DriveItemData[], isTeam: boolean): Promise<any> {
  const promises: Promise<any>[] = [];

  for (const item of items) {
    promises.push((item.isFolder ?
      folderService.deleteFolder(item as DriveFolderData, isTeam) :
      fileService.deleteFile(item as DriveFileData, isTeam)
    ));
  }

  return Promise.all(promises);
}


const clearMoveOpEvent = (moveOpId) => {
  delete this.moveEvent[moveOpId];
};

const decreaseMoveOpEventCounters = (isError, moveOpId) => {
  this.moveEvent[moveOpId].errors += isError;
  this.moveEvent[moveOpId].total -= 1;
  this.moveEvent[moveOpId].resolved += 1;
};

export function moveItems (items: DriveItemData[], destination: number, moveOpId) => {
  const isTeam = this.props.workspace === Workspace.Business;

  // Don't want to request this...
  if (items.some((item) => item.isFolder && item.id === destination)) {
    return toast.warn('You can\'t move a folder inside itself\'');
  }

  // Init default operation properties
  if (!this.moveEvent[moveOpId]) {
    this.moveEvent[moveOpId] = {
      total: 0,
      errors: 0,
      resolved: 0,
      itemsLength: items.length
    };
  }

  // Increment operation property values
  this.moveEvent[moveOpId].total += items.length;

  // Move Request body
  const data = { destination };

  let keyOp; // Folder or File
  // Fetch for each first levels items

  items.forEach((item) => {
    keyOp = item.isFolder ? 'Folder' : 'File';
    data[keyOp.toLowerCasemove() + 'Id'] = item.fileId || item.id;
    fetch(`/api/storage/move${keyOp}`, {
      method: 'post',
      headers: getHeaders(true, true, isTeam),
      body: JSON.stringify(data)
    }).then(async (res) => {
      const response = await res.json();
      const success = res.status === 200;
      const moveEvent = this.moveEvent[moveOpId];

      // Decreasing counters...
      this.decreaseMoveOpEventCounters(!success, moveOpId);

      if (!success) {
        toast.warn(`Error moving ${keyOp.toLowerCase()} '${response.item.name}`);
      } else {
        analyticsService.trackMoveItem(keyOp, {
          file_id: response.item.id,
          email: this.props.user.email,
          platform: DevicePlatform.Web
        });
        // Remove myself
        const items = this.props.items.filter((commanderItem: any) =>
          item.isFolder
            ? !commanderItem.isFolder ||
            (commanderItem.isFolder && !(commanderItem.id === item.id))
            : commanderItem.isFolder ||
            (!commanderItem.isFolder && !(commanderItem.fileId === item.fileId))
        );
        // update state for updating commander items list

        this.props.dispatch(storageActions.setItems(items));
      }

      if (moveEvent.total === 0) {
        this.clearMoveOpEvent(moveOpId);
        // If empty folder list move back
        if (!this.props.items.length) {
          this.folderTraverseUp();
        }
      }
    });
  });
};


const storageService = {
  deleteItems,
  moveItems,
  upload,
  name
};

export default storageService;