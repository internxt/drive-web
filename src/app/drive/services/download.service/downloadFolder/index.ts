import configService from '../../../../core/services/config.service';
import { DownloadFolderMethod } from '../../../types';
import downloadFolderUsingBlobs from './downloadFolderUsingBlobs';
import downloadFolderUsingFileSystemAccessAPI from './downloadFolderUsingFileSystemAccessAPI';
import downloadFolderUsingStreamSaver from './downloadFolderUsingStreamSaver';

const downloadFolderMethods = {
  [DownloadFolderMethod.Blob]: downloadFolderUsingBlobs,
  [DownloadFolderMethod.FileSystemAccessAPI]: downloadFolderUsingFileSystemAccessAPI,
  [DownloadFolderMethod.StreamSaver]: downloadFolderUsingStreamSaver,
};

export default downloadFolderMethods[configService.getAppConfig().fileExplorer.download.folder.method];
