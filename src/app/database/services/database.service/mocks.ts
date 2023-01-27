import { DatabaseCollection, DriveItemBlobData } from '.';

const folderBlobItems: DriveItemBlobData[] = [{ id: 11 }, { id: 15 }, { id: 13 }, { id: 14 }];
const folderTwoBlobItems: DriveItemBlobData[] = [{ id: 21 }];
const folderThreeBlobItems = [{ id: 341 }, { id: 342 }, { id: 343 }];
const levels_blobs = { 1: [...folderBlobItems], 2: [...folderTwoBlobItems], 34: [...folderThreeBlobItems] };
const photos = { id1: { source: {} }, id2: { source: {} } };

const database = {
  [DatabaseCollection.Levels]: { ...levels_blobs },
  [DatabaseCollection.LevelsBlobs]: { ...levels_blobs },
  [DatabaseCollection.Photos]: { ...photos },
};

export { folderBlobItems, folderTwoBlobItems, folderThreeBlobItems, levels_blobs, photos, database };
