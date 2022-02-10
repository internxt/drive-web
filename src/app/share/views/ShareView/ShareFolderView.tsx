import { Component } from 'react';
import { match } from 'react-router';
import JSZip from 'jszip';
import fileDownload from 'js-file-download';
import { Readable } from 'stream';
import streamSaver from 'streamsaver';
import { SharedDirectoryFile } from '@internxt/sdk/dist/drive/share/types';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import {
  getSharedDirectoryFiles,
  getSharedDirectoryFolders,
  getSharedFolderInfo,
} from 'app/share/services/share.service';

import { ReactComponent as Spinner } from 'assets/icons/spinner.svg';
import { ReactComponent as Logo } from 'assets/icons/big-logo.svg';
import iconService from 'app/drive/services/icon.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { TaskProgress } from 'app/tasks/types';
import i18n from 'app/i18n/services/i18n.service';
import sizeService from '../../../drive/services/size.service';
import { IDownloadParams, Network } from '../../../drive/services/network';

import 'react-toastify/dist/ReactToastify.css';
import './ShareView.scss';

// eslint-disable-next-line max-len
import { downloadSharedFolderUsingStreamSaver } from 'app/drive/services/download.service/downloadFolder/downloadSharedFolderUsingStreamSaver';

export interface ShareViewProps {
  match: match<{
    token: string;
    code: string;
  }>;
}

interface FolderPackage {
  folderId: number;
  pack: JSZip;
}

interface ShareViewState {
  token: string;
  error: string | null;
  progress: number;
  ready: boolean;
  info: ShareTypes.SharedFolderInfo;
  completedFolders: FolderPackage[];
  rootPackage: JSZip;
}

class ShareFolderView extends Component<ShareViewProps, ShareViewState> {
  FOLDERS_LIMIT_BY_REQUEST = 16;
  FILES_LIMIT_BY_REQUEST = 128;
  state = {
    token: this.props.match.params.token,
    code: this.props.match.params.code,
    error: null,
    progress: TaskProgress.Min,
    ready: false,
    info: {
      folderId: 0,
      name: '',
      size: 0,
      bucket: '',
      bucketToken: '',
    },
    completedFolders: [],
    rootPackage: new JSZip(),
  };

  componentDidMount(): void {
    this.loadFolderInfo().then(() => {
      console.log('download finished');
    });
    // .then(() => {
    //   this.setState({
    //     ready: true,
    //   });
    // })
    // .catch((err) => {
    //   this.setState({
    //     error: err.message,
    //   });
    // });
  }

  updateProgress = (progress) => {
    this.setState({
      progress: Math.max(TaskProgress.Min, progress * 100),
    });
  };

  /**
   * Fetches general info and directory folders structure
   */
  // loadFolderInfo = async () => {
  //   if (navigator.userAgent.match('CriOS')) {
  //     // ! iOS Chrome is not supported
  //     throw new Error('Chrome iOS not supported. Use Safari to proceed');
  //   }

  //   const folderInfo = await getSharedFolderInfo(this.state.token);
  //   const rootFolderId = folderInfo.folderId;
  //   this.setState({
  //     info: {
  //       folderId: rootFolderId,
  //       name: folderInfo.name,
  //       size: folderInfo.size,
  //       bucket: folderInfo.bucket,
  //       bucketToken: folderInfo.bucketToken,
  //     },
  //   });

  //   let currentOffset = 0;
  //   const zip = new JSZip();
  //   const writableStream = streamSaver.createWriteStream(`${folderInfo.name}.zip`, {});
  //   const writer = writableStream.getWriter();

  //   const rootFolder: FolderPackage = {
  //     folderId: rootFolderId,
  //     pack: zip,
  //   };
  //   const pendingFolders: FolderPackage[] = [rootFolder];

  //   let folderDownloadCompleted = false;

  //   const { bucket, bucketToken } = this.state.info;

  //   do {
  //     const folderToDownload = pendingFolders.shift() as FolderPackage;

  //     console.log('downloading folder %s', folderToDownload.folderId);

  //     while (!folderDownloadCompleted) {
  //       const payload: ShareTypes.GetSharedDirectoryFoldersPayload = {
  //         token: this.state.token,
  //         directoryId: folderToDownload.folderId,
  //         offset: currentOffset,
  //         limit: this.FOLDERS_LIMIT_BY_REQUEST,
  //       };

  //       const nextFoldersChunkPromise = getSharedDirectoryFolders(payload).then((foldersResponse) => {
  //         foldersResponse.folders.forEach(({ id, name }) => {
  //           pendingFolders.push({
  //             folderId: id,
  //             pack: folderToDownload.pack.folder(name),
  //           });
  //         });

  //         return foldersResponse;
  //       });

  //       await putDirectoryFilesInsideZip(folderToDownload.pack, bucket, bucketToken, {
  //         token: this.state.token,
  //         code: this.state.code,
  //         directoryId: folderToDownload.folderId,
  //         limit: this.FILES_LIMIT_BY_REQUEST,
  //       });

  //       const { last } = await nextFoldersChunkPromise;

  //       folderDownloadCompleted = last;
  //       currentOffset += this.FOLDERS_LIMIT_BY_REQUEST;
  //     }
  //   } while (pendingFolders.length > 0);

  //   return new Promise<void>((resolve, reject) => {
  //     const folderStream = zip.generateInternalStream({
  //       type: 'uint8array',
  //       streamFiles: true,
  //       compression: 'DEFLATE',
  //     }) as Readable;
  //     folderStream
  //       ?.on('data', (chunk: Buffer) => {
  //         console.log('folder data here');
  //         writer.write(chunk);
  //       })
  //       .on('error', (err) => {
  //         reject(err);
  //       })
  //       .on('end', () => {
  //         writer.close();
  //         window.removeEventListener('unload', writer.abort);
  //         resolve();
  //       });

  //     folderStream.resume();
  //   });
  // };

  loadFolderInfo = async () => {
    if (navigator.userAgent.match('CriOS')) {
      // ! iOS Chrome is not supported
      throw new Error('Chrome iOS not supported. Use Safari to proceed');
    }

    const folderInfo = await getSharedFolderInfo(this.state.token);

    return downloadSharedFolderUsingStreamSaver(
      {
        name: folderInfo.name,
        code: this.state.code,
        id: folderInfo.folderId,
        token: this.state.token,
      },
      folderInfo.bucket,
      folderInfo.bucketToken,
      {
        filesLimit: this.FILES_LIMIT_BY_REQUEST,
        foldersLimit: this.FOLDERS_LIMIT_BY_REQUEST,
      },
    );
  };

  isFileSystemApiAvailable = (): boolean => {
    return 'showSaveFilePicker' in window;
  };

  /**
   * Triggered when user starts the shared folder download
   * Decides if download should happen using streams or BLOBs
   */
  download = async (): Promise<void> => {
    // if (this.isFileSystemApiAvailable()) {
    //   await this.downloadWithStreams();
    // } else {
    //   await this.downloadWithBlobs();
    // }
  };

  /**
   * Launches the download logic configuring the packaging to use BLOBs
   */
  downloadWithBlobs = async (): Promise<void> => {
    await this.downloadDirectory(
      async (network: Network, pack: JSZip, file: SharedDirectoryFile, params: IDownloadParams) => {
        const [fileBlobPromise] = network.downloadFile(this.state.info.bucket, file.id, params);
        const fileBlob = await fileBlobPromise;
        pack.file(`${file.name}.${file.type}`, fileBlob);
      },
      async () => {
        await this.state.rootPackage.generateAsync({ type: 'blob' }).then((content) => {
          fileDownload(content, `${this.state.info.name}.zip`, 'application/zip');
        });
      },
    );
  };

  /**
   * Launches the download logic configuring the packaging to use streams
   */
  // downloadWithStreams = async (): Promise<void> => {
  //   await this.downloadDirectory(
  //     async (
  //       network: Network,
  //       pack: JSZip,
  //       file: SharedDirectoryFile,
  //       params: IDownloadParams
  //     ) => {
  //       const [fileStreamPromise] = network.getFileDownloadStream(
  //         this.state.info.bucket,
  //         file.id,
  //         params
  //       );
  //       const fileStream = await fileStreamPromise;
  //       pack.file(`${file.name}.${file.type}`, fileStream, { compression: 'DEFLATE' });
  //     },
  //     async () => {
  //       const writableStream = streamSaver.createWriteStream(`${this.state.info.name}.zip`, {});
  //       const writer = writableStream.getWriter();

  //       await new Promise<void>((resolve, reject) => {
  //         const folderStream = this.state.rootPackage.generateInternalStream({
  //           type: 'uint8array',
  //           streamFiles: true,
  //           compression: 'DEFLATE',
  //         }) as Readable;
  //         folderStream
  //           ?.on('data', (chunk: Buffer) => {
  //             console.log('folder data here');
  //             writer.write(chunk);
  //           })
  //           .once('error', (err) => {
  //             writer.close();
  //             reject(err);
  //           })
  //           .once('end', () => {
  //             writer.close();
  //             window.removeEventListener('unload', writer.abort);
  //             resolve();
  //           }).resume();
  //       });
  //     }
  //   );
  // };

  /**
   * Performs the common logic of fetching files details and downloading data from network
   * @param downloadFile
   * @param packFiles
   */
  downloadDirectory = async (
    downloadFileFunction: (
      network: Network,
      pack: JSZip,
      file: SharedDirectoryFile,
      params: IDownloadParams,
    ) => Promise<void>,
    packFiles: () => Promise<void>,
  ) => {
    const network = new Network('NONE', 'NONE', 'NONE');
    const downloadingSize: Record<number, number> = {};

    const pendingFolders = this.state.completedFolders as FolderPackage[];

    while (pendingFolders.length) {
      /** For each folder */
      const { folderId, pack } = pendingFolders.shift() as FolderPackage;
      let currentOffset = 0;
      let completed = false;

      while (!completed) {
        /** Until we have all files from folder */
        const payload: ShareTypes.GetSharedDirectoryFilesPayload = {
          token: this.state.token,
          code: this.state.code,
          directoryId: folderId,
          offset: currentOffset,
          limit: this.FILES_LIMIT_BY_REQUEST,
        };
        const { files, last } = await getSharedDirectoryFiles(payload);

        for (const file of files) {
          await downloadFileFunction(network, pack, file, {
            fileEncryptionKey: Buffer.from(file.encryptionKey, 'hex'),
            fileToken: this.state.info.bucketToken,
            progressCallback: (fileProgress) => {
              downloadingSize[file.id] = file.size * fileProgress;
              const totalDownloadedSize = Object.values(downloadingSize).reduce((t, x) => t + x, 0);
              const totalProgress = totalDownloadedSize / this.state.info.size;
              this.updateProgress(totalProgress);
            },
          });
        }

        completed = last;
        currentOffset += this.FILES_LIMIT_BY_REQUEST;
      }
    }

    await packFiles();
  };

  render(): JSX.Element {
    if (this.state.error) {
      return this.renderBody(<p className="text-lg text-red-70">{this.state.error}</p>);
    }

    if (!this.state.ready) {
      return this.renderBody(<Spinner className="fill-current animate-spin h-16 w-16" />);
    }

    const ItemIconComponent = iconService.getItemIcon(true);

    const DownloadButton = (
      <BaseButton onClick={this.download} className="primary font-bold p-5">
        {i18n.get('actions.download')}
      </BaseButton>
    );

    return this.renderBody(
      <div
        className="bg-white w-full mx-5 md:w-1/2 xl:w-1/4 border\
           border-solid rounded border-l-neutral-50 flex flex-col items-center justify-center py-8"
        style={{ minHeight: '40%' }}
      >
        <div className="flex items-center max-w-full px-4">
          <ItemIconComponent className="mr-5"></ItemIconComponent>{' '}
          <h1 className="text-2xl overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full">
            {this.state.info.name}
          </h1>
        </div>
        <p className="text-l-neutral-50 text-sm mt-1">{sizeService.bytesToString(this.state.info?.size)}</p>
        <div className="h-12 mt-5">{this.state.progress ? ProgressComponent(this.state.progress) : DownloadButton}</div>
      </div>,
    );
  }

  renderBody = (body): JSX.Element => {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-10 relative">
        <Logo className="absolute top-5 left-5 h-auto w-32"></Logo>
        {body}
      </div>
    );
  };
}

function ProgressComponent(progress) {
  const progressBarPixelsTotal = 100;
  const progressBarPixelsCurrent = (progress * progressBarPixelsTotal) / 100;
  return progress < 100 ? (
    <div style={{ width: `${progressBarPixelsTotal}px` }} className="bg-l-neutral-20">
      <div
        style={{ width: `${progressBarPixelsCurrent}px` }}
        className="border-t-8 rounded border-l-neutral-50 transition-width duration-1000"
      ></div>
    </div>
  ) : (
    <UilCheck className="text-green-50" height="40" width="40"></UilCheck>
  );
}

export default ShareFolderView;
