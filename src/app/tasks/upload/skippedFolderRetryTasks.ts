import { items as itemUtils } from '@internxt/lib';
import { RetryableTask, RetryableTaskType } from 'app/network/RetryManager';
import { filterFilesByMaxSize } from 'app/store/slices/storage/fileUtils/filterFilesByMaxSize';
import { isHiddenFile } from 'app/store/slices/storage/fileUtils/prepareFilesToUpload';
import { IRoot } from 'app/store/slices/storage/types';
import { SkippedFileRetryParams } from 'app/tasks/types';
import { uniqueId } from 'utils/lodash';

interface SkippedFolderRetryTasksProps {
  skippedFolder: IRoot;
  folderTaskId: string;
  maxUploadFileSize: number;
}

/**
 * Builds one failed upload retry entry per file under a skipped subfolder, at any depth, tied to the
 * folder task. Hidden files and files over the max upload size are left out, as the folder upload
 * itself never uploads them.
 */
export const buildSkippedFolderRetryTasks = ({
  skippedFolder,
  folderTaskId,
  maxUploadFileSize,
}: SkippedFolderRetryTasksProps): RetryableTask[] => {
  const parentFolderId = skippedFolder.folderId as string;

  const buildFileTask = (file: File, missingFolderPath: string[]): RetryableTask => {
    const { filename, extension } = itemUtils.getFilenameAndExt(file.name);
    const taskId = uniqueId('skipped-file-');
    const params: SkippedFileRetryParams = {
      taskId,
      relatedTaskId: folderTaskId,
      parentFolderId,
      missingFolderPath,
      filecontent: { name: filename, type: extension ?? '', size: file.size, content: file, parentFolderId },
    };
    return { taskId, type: RetryableTaskType.Upload, params };
  };

  const buildFolderTasks = (folder: IRoot, parentPath: string[]): RetryableTask[] => {
    const missingFolderPath = [...parentPath, folder.name];
    const visibleFiles = folder.childrenFiles.filter((file) => !isHiddenFile(file.name));
    const { allowedFilesToUpload } = filterFilesByMaxSize({ files: visibleFiles, maxUploadFileSize });

    return [
      ...allowedFilesToUpload.map((file) => buildFileTask(file, missingFolderPath)),
      ...folder.childrenFolders.flatMap((childFolder) => buildFolderTasks(childFolder, missingFolderPath)),
    ];
  };

  return buildFolderTasks(skippedFolder, []);
};
