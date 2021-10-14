import { DownloadFolderMethod } from '../../../models/enums';
import configService from '../../config.service';
import downloadFolderUsingBlobs from './downloadFolderUsingBlobs';
import downloadFolderUsingFileSystemAccessAPI from './downloadFolderUsingFileSystemAccessAPI';
import downloadFolderUsingStreamSaver from './downloadFolderUsingStreamSaver';

const downloadFolderMethods = {
  [DownloadFolderMethod.Blob]: downloadFolderUsingBlobs,
  [DownloadFolderMethod.FileSystemAccessAPI]: downloadFolderUsingFileSystemAccessAPI,
  [DownloadFolderMethod.StreamSaver]: downloadFolderUsingStreamSaver,
};

export default downloadFolderMethods[configService.getAppConfig().fileExplorer.download.folder.method];
