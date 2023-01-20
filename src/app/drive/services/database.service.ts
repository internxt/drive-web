import databaseService, { DatabaseCollection } from '../../database/services/database.service';

const updateDatabaseFilePrewiewData = async ({
  fileId,
  folderId,
  previewBlob,
}: {
  fileId: number;
  folderId: number;
  updatedAt: string;
  previewBlob: Blob;
}): Promise<void> => {
  const folderBlobItems = await databaseService.get(DatabaseCollection.LevelsBlobs, folderId);
  const folderBlobsWithNewThumbnail = folderBlobItems?.map((folderBlobItem) =>
    folderBlobItem?.id === fileId
      ? {
          ...folderBlobItem,
          preview: previewBlob,
        }
      : folderBlobItem,
  );
  if (folderBlobsWithNewThumbnail)
    databaseService.put(DatabaseCollection.LevelsBlobs, folderId as number, folderBlobsWithNewThumbnail);
};

const updateDatabaseFileSourceData = async ({
  databaseFolderBlobItems,
  fileId,
  folderId,
  updatedAt,
  sourceBlob,
}: {
  databaseFolderBlobItems:
    | {
        id: number;
        preview?: Blob | undefined;
        source?: Blob | undefined;
        updatedAt?: string | undefined;
      }[]
    | undefined;
  fileId: number;
  folderId: number;
  updatedAt: string;
  sourceBlob: Blob;
}): Promise<void> => {
  const folderItemsFiltered = databaseFolderBlobItems?.length
    ? databaseFolderBlobItems?.filter((blobItem) => blobItem?.id !== fileId)
    : [];
  folderItemsFiltered.push({
    id: fileId,
    source: sourceBlob,
    updatedAt: updatedAt,
  });

  databaseService.put(DatabaseCollection.LevelsBlobs, folderId, folderItemsFiltered);
};

export { updateDatabaseFilePrewiewData, updateDatabaseFileSourceData };
