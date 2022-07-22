import configService from 'app/core/services/config.service';
import { DownloadFolderMethod } from '../../../types';
import downloadFolderUsingFileSystemAccessAPI from './downloadFolderUsingFileSystemAccessAPI';
import downloadFolderUsingStreamSaver from './downloadFolderUsingStreamSaver';

const downloadFolderMethods = {
  [DownloadFolderMethod.FileSystemAccessAPI]: downloadFolderUsingFileSystemAccessAPI,
  [DownloadFolderMethod.StreamSaver]: downloadFolderUsingStreamSaver,
};

export default downloadFolderMethods[configService.getAppConfig().fileExplorer.download.folder.method];
