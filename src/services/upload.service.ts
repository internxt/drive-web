import { getFilenameAndExt, encryptFilename } from '../lib/utils';
import { toast } from 'react-toastify';
import FileLogger from './fileLogger';
import { MAX_ALLOWED_UPLOAD_SIZE, ENCRYPT_VERSION } from './constants.service';
import { getFilenameAndExtension, resolveNameConflicts, File } from './file';
import { eachLimit } from './async';
import { Network, getEnvironmentConfig } from '../lib/network';
import localStorage from './localStorage.service';
import { getHeaders } from '../lib/auth';
import history from '../lib/history';

function validateFolderId(folderID) {
  if (!folderId) {
    throw new Error('No folder ID provided');
  }
}

interface FileEntry {
  fileId,
  file_id,
  type,
  bucket,
  size,
  folder_id,
  name,
  encrypt_version
}

/**
 *
 *
 * @param {*} file
 * @param {FileEntry} fileEntry
 * @param {boolean} [isTeam=false]
 * @return {*} Promise with data when resolved
 */
function createNetworkFileEntry(file, fileEntry: FileEntry, isTeam = false) {
  const encryptedName = encryptFilename(file.name, fileEntry.folder_id);
  const headers = getHeaders(true, true, isTeam);
  const body = JSON.stringify({ file: fileEntry });
  const params = { method: 'post', headers, body };

  return fetch('/api/storage/file', params).then(response => {
    return response.json();
  });
}

function validateBucketId(bucketId) {
  if (!bucketId) {
    // coming from auto-login or something else that is not loading all required data
    /*
    window.analytics.track('file-upload-bucketid-undefined', {
      email: getUserData().email,
      platform: 'web'
    });
    */

    toast.warn('Login again to start uploading files');
    localStorage.clear();
    // Push to login
    // history.push('/login');
    return false;
  }
  return true;
}

interface uploadOptions {
  file,
  folderId: number,
  network,
  envConfig
}

// Returns a function
async function uploadFile(opt: uploadOptions) {
  // You have it all in file.fullPath
  //const { filename, extension } = getFilenameAndExt(file.name);
  //const filePath = file.webkitRelativePath + '/' + file.name;
  const { file, folderId, network, envConfig } = opt;

  validateFolderId(folderId);

  try {
    // SEGMENT TRACK FILE upload start
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = getEnvironmentConfig();

    if (!validateBucketId(bucketId)) {
      return;
    }
    // initialize network
    // const network = new Network(bridgeUser, bridgePass, encryptionKey);
    const filecontent = new Blob([file], { type: file.type });
    const fileId = await network.uploadFile(bucketId, {
      filepath: file.fullPath,
      filesize: file.size,
      filecontent,
      progressCallback: (progress) => {
        // STATUS: UPLOAD FILE PROGRESS AS % AND UPLOADING
        if (progress > 0) {
          FileLogger.push({ action: 'upload', status: 'pending', filePath: file.fullPath, progress });
        }
      }
    });

    // Create a fileEntry
    const data = await createNetworkFileEntry(
      file,
      {
        fileId,
        file_id: fileId,
        type: file.type,
        bucket: bucketId,
        size: file.size,
        folder_id: folderId,
        name: file.name,
        encrypt_version: ENCRYPT_VERSION
      }
    );

  } catch {
    // TODO
  }

  //STATUS: ENCRYPTING STATUS FILES -> should be inside of the returned function
  // FileLogger.push({ action: 'upload', status: 'encrypting', filePath: filePathToUpload });

}

export async function uploadFolder(folder) {
  // TODO
}


/**
 * Uploads Files. Should have been checked if file name already exists
 *
 * @param {Array<File>} fileList
 * @param {string} path
 */
async function uploadFiles(fileList: Array<File>, folderId) {
  resolveNameConflicts(fileList);
  fileList.forEach(file => {

    // filesToUpload.push({ name: filename, size: file.size, type: extension, isLoading: true, content: file });

    // Will have the results from
    eachLimit(fileList.map(file => uploadFile(file, folderId)), 1);

  });
}

// get File from FileEntry
async function getFile(fileEntry) {
  try {
    return await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
  } catch (err) {
    console.log(err);
  }
}

async function handleUploadFiles(files, parentFolderId, folderId, folderPath = null) {
  // files should already be a list of files

  const filesToUpload = [];
  const showSizeWarning = files.some(file => file.size >= MAX_ALLOWED_UPLOAD_SIZE);

  console.log('File size trying to be uplodaded is %s bytes', files.reduce((accum, file) => accum + file.size, 0));

  if (showSizeWarning) {
    toast.warn('File too large.\nYou can only upload or download files of up to 1GB through the web app');
    return;
  }

  // should be validated prior to the call to this function
  parentFolderId = parentFolderId || folderId;

  let relativePath = this.state.namePath.map((pathLevel) => pathLevel.name).slice(1).join('/');

  // when a folder and its subdirectory is uploaded by drop, this.state.namePath keeps its value at the first level of the parent folder
  // so we need to add the relative folderPath (the path from parent folder uploaded to the level of the file being uploaded)
  // when uploading deeper files than the current level
  if (folderPath) {
    if (relativePath !== '') {
      relativePath += '/' + folderPath;
    } else {
      // if is the first path level, DO NOT ADD a '/'
      relativePath += folderPath;
    }
  }

  let filePathToUpload = '';

  files.forEach(file => {
    const { filename, extension } = getFilenameAndExt(file.name);

    const path = relativePath === '' ? 'All Files' : 'All Files/';

    filePathToUpload = path + relativePath + '/' + file.name;
    //STATUS: ENCRYPTING STATUS FILES
    FileLogger.push({ action: 'upload', status: 'encrypting', filePath: filePathToUpload });

    filesToUpload.push({ name: filename, size: file.size, type: extension, isLoading: true, content: file });
  });

  for (const file of filesToUpload) {
    let fileNameExists = this.fileNameExists(file.name, file.type);

    if (parentFolderId === currentFolderId) {
      this.setState({ currentCommanderItems: [...this.state.currentCommanderItems, file] });

      if (fileNameExists) {
        file.name = this.getNewName(file.name, file.type);
        // File browser object don't allow to rename, so you have to create a new File object with the old one.
        file.content = renameFile(file.content, file.name);
      }
    }
  }

  let fileBeingUploaded;

  let uploadErrors = [];

  try {
    await async.eachLimit(filesToUpload, 1, (file, nextFile) => {
      fileBeingUploaded = file;

      let rateLimited = false;

      this.upload(file, parentFolderId, relativePath, filePathToUpload)
        .then(({ res, data }) => {
          //STATUS: FINISH UPLOADING FILE
          FileLogger.push({ action: 'upload', status: 'success', filePath: filePathToUpload });

          if (parentFolderId === currentFolderId) {
            const index = this.state.currentCommanderItems.findIndex((obj) => obj.name === file.name);
            const filesInFileExplorer = [...this.state.currentCommanderItems];

            filesInFileExplorer[index].isLoading = false;
            filesInFileExplorer[index].fileId = data.fileId;
            filesInFileExplorer[index].id = data.id;

            this.setState({ currentCommanderItems: filesInFileExplorer });
          }

          if (res.status === 402) {
            this.setState({ rateLimitModal: true });
            rateLimited = true;
            throw new Error('Rate limited');
          }
        }).catch((err) => {
          //STATUS: ERROR UPLOAD FILE

          FileLogger.push({ action: 'upload', status: 'error', filePath: filePathToUpload, message: err.message });
          uploadErrors.push(err);
          console.log(err);

          this.removeFileFromFileExplorer(fileBeingUploaded.name);
        }).finally(() => {
          if (rateLimited) {
            return nextFile(Error('Rate limited'));
          }
          nextFile(null);
        });

      if (uploadErrors.length > 0) {
        throw new Error('There were some errors during upload');
      }
    });
  } catch (err) {
    //STATUS: ERROR UPLOAD FILE

    FileLogger.push({ action: 'upload', status: 'error', filePath: filePathToUpload, message: err.message });
    if (err.message === 'There were some errors during upload') {
      // TODO: List errors in a queue?
      return uploadErrors.forEach(uploadError => {
        toast.warn(uploadError.message);
      });
    }

    toast.warn(err.message);
  }
}