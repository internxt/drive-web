import { DatabaseCollection, DriveItemBlobData } from '.';

const folderBlobItems: DriveItemBlobData[] = [
  { id: 11, parentId: 1 },
  { id: 15, parentId: 1 },
  { id: 13, parentId: 1 },
  { id: 14, parentId: 1 },
];
const folderTwoBlobItems: DriveItemBlobData[] = [{ id: 21, parentId: 2 }];
const folderThreeBlobItems: DriveItemBlobData[] = [
  { id: 341, parentId: 3 },
  { id: 342, parentId: 3 },
  { id: 343, parentId: 3 },
];
const levels_blobs = { 1: [...folderBlobItems], 2: [...folderTwoBlobItems], 34: [...folderThreeBlobItems] };

const database = {
  [DatabaseCollection.Levels]: { ...levels_blobs },
  [DatabaseCollection.LevelsBlobs]: { ...levels_blobs },
};

export { folderBlobItems, folderTwoBlobItems, folderThreeBlobItems, levels_blobs, database };
