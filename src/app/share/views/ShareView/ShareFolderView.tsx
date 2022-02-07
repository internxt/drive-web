import { Component } from 'react';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import {
  getSharedDirectoryFiles,
  getSharedDirectoryFolders,
  getSharedFolderInfo
} from 'app/share/services/share.service';
import { ReactComponent as Spinner } from 'assets/icons/spinner.svg';
import { ReactComponent as Logo } from 'assets/icons/big-logo.svg';
import iconService from 'app/drive/services/icon.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { TaskProgress } from 'app/tasks/types';
import i18n from 'app/i18n/services/i18n.service';
import JSZip from 'jszip';

import './ShareView.scss';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import sizeService from '../../../drive/services/size.service';
import { Network } from '../../../drive/services/network';
import fileDownload from 'js-file-download';

export interface ShareViewProps {
  match: match<{
    token: string,
    code: string,
  }>;
}

interface FolderPackage {
  folderId: number
  pack: JSZip
}

interface ShareViewState {
  token: string
  error: string | null
  progress: number
  ready: boolean
  info: ShareTypes.SharedFolderInfo
  completedFolders: FolderPackage[]
  rootPackage: JSZip
}

class ShareFolderView extends Component<ShareViewProps, ShareViewState> {
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
      bucketToken: ''
    },
    completedFolders: [],
    rootPackage: new JSZip()
  };

  componentDidMount(): void {
    this.loadInfo()
      .then(() => {
        this.setState({
          ready: true
        });
      })
      .catch(error => {
        this.setState({
          error: error.message
        });
      });
  }

  loadInfo = async () => {
    if (navigator.userAgent.match('CriOS')) {
      // ! iOS Chrome is not supported
      throw new Error('Chrome iOS not supported. Use Safari to proceed');
    }

    let rootFolderId;
    try {
      // Load initial info
      const folderInfo = await getSharedFolderInfo(this.state.token);
      rootFolderId = folderInfo.folderId;
      this.setState({
        info: {
          folderId: rootFolderId,
          name: folderInfo.name,
          size: folderInfo.size,
          bucket: folderInfo.bucket,
          bucketToken: folderInfo.bucketToken,
        },
      });
    } catch (err) {
      throw new Error(i18n.get('error.linkExpired'));
    }

    const requestLimit = 10;
    let currentOffset = 0;

    const pendingFolders: FolderPackage[] = [{
      folderId: rootFolderId,
      pack: this.state.rootPackage
    }];
    const completedFolders: FolderPackage[] = [];

    while (pendingFolders.length) {
      const { folderId, pack } = (pendingFolders.shift() as FolderPackage);
      let completed = false;
      while (!completed) {
        const payload: ShareTypes.GetSharedDirectoryFoldersPayload = {
          token: this.state.token,
          directoryId: folderId,
          offset: currentOffset,
          limit: requestLimit,
        };
        const foldersResponse = await getSharedDirectoryFolders(payload);
        foldersResponse.folders.map(folder => {
          pendingFolders.push({
            folderId: folder.id,
            pack: pack.folder(folder.name)
          });
        });
        completed = foldersResponse.last;
        currentOffset += requestLimit;
      }
      completedFolders.push({ folderId, pack });
    }

    this.setState({
      completedFolders: completedFolders
    });
  }

  updateProgress = (progress) => {
    this.setState({
      progress: Math.max(TaskProgress.Min, progress * 100)
    });
  }

  download = async (): Promise<void> => {
    const network = new Network('NONE', 'NONE', 'NONE');
    const downloadingSize: Record<number, number> = {};
    const filesRequestLimit = 10;

    const pendingFolders = this.state.completedFolders as FolderPackage[];

    while (pendingFolders.length) {
      const { folderId, pack } = pendingFolders.shift() as FolderPackage;
      let currentOffset = 0;
      let completed = false;

      while (!completed) {
        const payload: ShareTypes.GetSharedDirectoryFilesPayload = {
          token: this.state.token,
          code: this.state.code,
          directoryId: folderId,
          offset: currentOffset,
          limit: filesRequestLimit,
        };
        const filesResponse = await getSharedDirectoryFiles(payload);

        for (const file of filesResponse.files) {
          const [fileBlobPromise] = network.downloadFile(
            this.state.info.bucket,
            file.id,
            {
              fileEncryptionKey: Buffer.from(file.encryptionKey, 'hex'),
              fileToken: this.state.info.bucketToken,
              progressCallback: (fileProgress) => {
                downloadingSize[file.id] = file.size * fileProgress;
                const totalDownloadedSize = Object.values(downloadingSize).reduce((t, x) => t + x, 0);
                const totalProgress = totalDownloadedSize / this.state.info.size;
                this.updateProgress(totalProgress);
              },
            }
          );
          const fileBlob = await fileBlobPromise;
          pack.file(`${file.name}.${file.type}`, fileBlob);
        }

        completed = filesResponse.last;
        currentOffset += filesRequestLimit;
      }
    }

    await this.state.rootPackage.generateAsync({ type: 'blob' }).then((content) => {
      fileDownload(content, `${this.state.info.name}.zip`, 'application/zip');
    });

  };

  render(): JSX.Element {
    if (this.state.error) {
      return this.renderBody(<p className="text-lg text-red-70">{this.state.error}</p>);
    }

    if (!this.state.ready) {
      return this.renderBody(<Spinner className="fill-current animate-spin h-16 w-16" />);
    }

    const { progress } = this.state;
    const progressBarPixelsTotal = 100;
    const progressBarPixelsCurrent = (progress * progressBarPixelsTotal) / 100;
    const formattedSize = sizeService.bytesToString(this.state.info?.size);
    const ItemIconComponent = iconService.getItemIcon(true);

    const ProgressComponent =
      progress < 100
        ?
        <div style={{ width: `${progressBarPixelsTotal}px` }} className="bg-l-neutral-20">
          <div
            style={{ width: `${progressBarPixelsCurrent}px` }}
            className="border-t-8 rounded border-l-neutral-50 transition-width duration-1000"
          ></div>
        </div>
        :
        <UilCheck className="text-green-50" height="40" width="40"></UilCheck>;

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
        <p className="text-l-neutral-50 text-sm mt-1">{formattedSize}</p>
        <div className="h-12 mt-5">{progress ? ProgressComponent : DownloadButton}</div>
      </div>
    );
  }

  renderBody = (body): JSX.Element => {
    return <div className="flex justify-center items-center h-screen bg-gray-10 relative">
      <Logo className="absolute top-5 left-5 h-auto w-32"></Logo>
      {body}
    </div>;
  }
}

export default ShareFolderView;
