import { Component } from 'react';
import { match } from 'react-router';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import { getSharedFolderInfo } from 'app/share/services/share.service';

import { ReactComponent as Spinner } from 'assets/icons/spinner.svg';
import { ReactComponent as Logo } from 'assets/icons/big-logo.svg';
import iconService from 'app/drive/services/icon.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import { TaskProgress } from 'app/tasks/types';
import i18n from 'app/i18n/services/i18n.service';
import sizeService from '../../../drive/services/size.service';

import 'react-toastify/dist/ReactToastify.css';
import './ShareView.scss';

// eslint-disable-next-line max-len
import { downloadSharedFolderUsingStreamSaver } from 'app/drive/services/download.service/downloadFolder/downloadSharedFolderUsingStreamSaver';
// eslint-disable-next-line max-len
import { downloadSharedFolderUsingBlobs } from 'app/drive/services/download.service/downloadFolder/downloadSharedFolderUsingBlobs';

export interface ShareViewProps {
  match: match<{
    token: string;
    code: string;
  }>;
}
interface ShareViewState {
  token: string;
  error: string | null;
  progress: number;
  ready: boolean;
  info: ShareTypes.SharedFolderInfo;
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
  };

  componentDidMount(): void {
    this.loadFolderInfo()
      .then((folderInfo) => {
        this.setState({
          ready: true,
          info: {
            folderId: folderInfo.folderId,
            name: folderInfo.name,
            size: folderInfo.size,
            bucket: folderInfo.bucket,
            bucketToken: folderInfo.bucketToken,
          },
        });
      })
      .catch((err) => {
        this.setState({
          error: err.message,
        });
      });
  }

  updateProgress = (progress) => {
    this.setState({
      progress: Math.max(TaskProgress.Min, progress * 100),
    });
  };

  loadFolderInfo = () => {
    if (navigator.userAgent.match('CriOS')) {
      // ! iOS Chrome is not supported
      throw new Error('Chrome iOS not supported. Use Safari to proceed');
    }

    return getSharedFolderInfo(this.state.token);
  };

  /**
   * Triggered when user starts the shared folder download
   * Decides if download should happen using streams or BLOBs
   */
  download = (): Promise<void> => {
    console.log('download');
    return 'showSaveFilePicker' in window ? this.downloadWithStreams() : this.downloadWithBlobs();
  };

  async downloadWithStreams(): Promise<void> {
    const [ downloadPromise ] = await downloadSharedFolderUsingStreamSaver(
      {
        name: this.state.info.name,
        code: this.state.code,
        id: this.state.info.folderId,
        token: this.state.token,
        size: this.state.info.size,
      },
      this.state.info.bucket,
      this.state.info.bucketToken,
      {
        filesLimit: this.FILES_LIMIT_BY_REQUEST,
        foldersLimit: this.FOLDERS_LIMIT_BY_REQUEST,
        progressCallback: (progress) => {
          // console.log('Progress: ', (progress * 100).toFixed(2));
          this.setState({
            progress: progress * 100,
          });
        },
      },
    );

    return downloadPromise;
  }

  downloadWithBlobs(): Promise<void> {
    return downloadSharedFolderUsingBlobs(
      {
        name: this.state.info.name,
        code: this.state.code,
        id: this.state.info.folderId,
        token: this.state.token,
      },
      this.state.info.bucket,
      this.state.info.bucketToken,
      {
        filesLimit: this.FILES_LIMIT_BY_REQUEST,
        foldersLimit: this.FOLDERS_LIMIT_BY_REQUEST,
      },
    );
  }

  private renderBody(body): JSX.Element {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-10 relative">
        <Logo className="absolute top-5 left-5 h-auto w-32"></Logo>
        {body}
      </div>
    );
  }

  render(): JSX.Element {
    if (this.state.error) {
      return this.renderBody(<p className="text-lg text-red-70">{this.state.error}</p>);
    }

    if (!this.state.ready) {
      return this.renderBody(<Spinner className="fill-current animate-spin h-16 w-16" />);
    }

    const ItemIconComponent = iconService.getItemIcon(true);

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
        <div className="h-12 mt-5">
          {this.state.progress ? (
            ProgressComponent(this.state.progress)
          ) : (
            <BaseButton onClick={this.download} className="primary font-bold p-5">
              {i18n.get('actions.download')}
            </BaseButton>
          )}
        </div>
      </div>,
    );
  }
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
