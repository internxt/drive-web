import { Component } from 'react';
import { match } from 'react-router';
import 'react-toastify/dist/ReactToastify.css';
import UilCheck from '@iconscout/react-unicons/icons/uil-check';
import { aes } from '@internxt/lib';

import { getShareInfo } from 'app/share/services/share.service';
import { ReactComponent as Spinner } from 'assets/icons/spinner.svg';
import { ReactComponent as Logo } from 'assets/icons/big-logo.svg';
import iconService from 'app/drive/services/icon.service';
import BaseButton from 'app/shared/components/forms/BaseButton';
import sizeService from 'app/drive/services/size.service';
import { TaskProgress } from 'app/tasks/types';
import { Network } from 'app/drive/services/network';
import i18n from 'app/i18n/services/i18n.service';

import './ShareView.scss';
import downloadService from 'app/drive/services/download.service';
import errorService from 'app/core/services/error.service';
import { ShareTypes } from '@internxt/sdk/dist/drive';

export interface ShareViewProps {
  match: match<{ token: string }>;
}

interface GetShareInfoWithDecryptedName extends ShareTypes.GetShareInfoResponse {
  decryptedName: string | null;
}

interface ShareViewState {
  token: string;
  progress: number;
  info: GetShareInfoWithDecryptedName | null;
  error: Error | null;
  accessedFile: boolean;
}

class ShareView extends Component<ShareViewProps, ShareViewState> {
  state = {
    token: this.props.match.params.token,
    progress: TaskProgress.Min,
    info: null,
    error: null,
    accessedFile: false,
  };

  loadInfo = async () => {
    this.setState({
      accessedFile: true,
    });

    const token = this.state.token;

    try {
      const info = await getShareInfo(token).catch(() => {
        throw new Error(i18n.get('error.linkExpired'));
      });

      this.setState({
        info: {
          ...info,
          decryptedName: this.getDecryptedName(info),
        },
      });
    } catch (err) {
      const castedError = errorService.castError(err);

      this.setState({
        error: castedError,
      });
    }
  };

  download = async (): Promise<void> => {
    const info = this.state.info as unknown as GetShareInfoWithDecryptedName | null;

    const MIN_PROGRESS = 5;

    if (info) {
      const network = new Network('NONE', 'NONE', 'NONE');

      this.setState({ progress: MIN_PROGRESS });
      const [fileBlobPromise] = network.downloadFile(info.bucket, info.file, {
        fileEncryptionKey: Buffer.from(info.encryptionKey, 'hex'),
        fileToken: info.fileToken,
        progressCallback: (progress) => {
          this.setState({ ...this.state, progress: Math.max(MIN_PROGRESS, progress * 100) });
        },
      });
      const fileBlob = await fileBlobPromise;

      // ! iOS Chrome requires special handling
      if (navigator.userAgent.match('CriOS')) {
        const reader = new FileReader();

        reader.onloadend = () => {
          const url = reader.result;
          const dataURI = 'data:' + fileBlob.type + ';base64,' + btoa(url as string);
          window.open(dataURI);
        };

        reader.readAsDataURL(fileBlob);
        return;
      }

      downloadService.downloadFileFromBlob(fileBlob, info.decryptedName as string);
    }
  };

  getDecryptedName(info: ShareTypes.GetShareInfoResponse): string {
    const salt = `${process.env.REACT_APP_CRYPTO_SECRET2}-${info.fileMeta.folderId.toString()}`;
    const decryptedFilename = aes.decrypt(info.fileMeta.name, salt);
    const type = info.fileMeta.type;

    return `${decryptedFilename}${type ? `.${type}` : ''}`;
  }

  render(): JSX.Element {
    const error = this.state.error as unknown as Error;
    let body;

    if (!this.state.accessedFile) {
      body = (
        <BaseButton onClick={this.loadInfo} className="primary font-bold p-5">
          {i18n.get('actions.accessFile')}
        </BaseButton>
      );
    } else if (error) {
      body = <p className="text-lg text-red-70">{error.message}</p>;
    } else if (this.state.info) {
      const info = this.state.info as unknown as GetShareInfoWithDecryptedName;

      const formattedSize = sizeService.bytesToString(info.fileMeta.size);

      const ItemIconComponent = iconService.getItemIcon(false, info.fileMeta.type);

      const { progress } = this.state;

      const progressBarPixelsTotal = 100;
      const progressBarPixelsCurrent = (progress * progressBarPixelsTotal) / 100;

      const ProgressComponent =
        progress < 100 ? (
          <div style={{ width: `${progressBarPixelsTotal}px` }} className="bg-l-neutral-20">
            <div
              style={{ width: `${progressBarPixelsCurrent}px` }}
              className="border-t-8 rounded border-l-neutral-50 transition-width duration-1000"
            ></div>
          </div>
        ) : (
          <UilCheck className="text-green-50" height="40" width="40"></UilCheck>
        );

      const DownloadButton = (
        <BaseButton onClick={this.download} className="primary font-bold p-5">
          {i18n.get('actions.download')}
        </BaseButton>
      );

      body = (
        <div
          className="bg-white w-full mx-5 md:w-1/2 xl:w-1/4 border\
           border-solid rounded border-l-neutral-50 flex flex-col items-center justify-center py-8"
          style={{ minHeight: '40%' }}
        >
          <div className="flex items-center max-w-full px-4">
            <ItemIconComponent className="mr-5"></ItemIconComponent>{' '}
            <h1 className="text-2xl overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full">
              {info.decryptedName}
            </h1>
          </div>
          <p className="text-l-neutral-50 text-sm mt-1">{formattedSize}</p>
          <div className="h-12 mt-5">{progress ? ProgressComponent : DownloadButton}</div>
        </div>
      );
    } else {
      body = <Spinner className="fill-current animate-spin h-16 w-16" />;
    }

    return (
      <div className="flex justify-center items-center h-screen bg-gray-10 relative">
        <Logo className="absolute top-5 left-5 h-auto w-32"></Logo>
        {body}
      </div>
    );
  }
}

export default ShareView;
