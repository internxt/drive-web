import * as React from 'react';
import fileDownload from 'js-file-download';
import { toast, ToastOptions } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import { isMobile } from 'react-device-detect';

import './ShareView.scss';
import { getShareInfo } from '../../services/share.service';
import { Network } from '../../lib/network';
import AesUtils from '../../lib/AesUtil';

interface ShareViewProps {
  match?: any
}

interface ShareViewState {
  token: string;
  progress: number;
}

class ShareView extends React.Component<ShareViewProps, ShareViewState> {
  toastOptions: ToastOptions = {
    position: 'bottom-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    draggable: true,
    pauseOnHover: true
  }

  state = {
    token: this.props.match.params.token,
    progress: 0
  }

  IsValidToken = (token: string): boolean => {
    return /^[a-z0-9]{20}$/.test(token);
  }

  componentDidMount() {
    if (this.IsValidToken(this.state.token)) {
      if (isMobile) {
        window.location.href = `https://api.internxt.com:8081/https://drive.internxt.com/api/storage/share/${this.state.token}`;
      } else {
        this.download();
      }
    } else {
      toast.warn('This secure link has expired', this.toastOptions);
    }
  }

  async download(): Promise<void> {
    const token = this.state.token;
    const shareInfo = await getShareInfo(token);

    toast.info('Securely retrieving file ...', {
      position: 'bottom-right',
      autoClose: false,
      draggable: false
    });

    const salt = `${process.env.REACT_APP_CRYPTO_SECRET2}-${shareInfo.fileMeta.folderId.toString()}`;
    const decryptedFilename = AesUtils.decrypt(shareInfo.fileMeta.name, salt);
    const type = shareInfo.fileMeta.type;
    const filename = `${decryptedFilename}${type ? `.${type}` : ''}`;

    const network = new Network('NONE', 'NONE', 'NONE');

    toast.info(`Downloading file ${filename} ...`, {
      position: 'bottom-right',
      autoClose: false,
      draggable: false
    });

    const file = await network.downloadFile(shareInfo.bucket, shareInfo.file, {
      fileEncryptionKey: Buffer.from(shareInfo.encryptionKey, 'hex'),
      fileToken: shareInfo.fileToken,
      progressCallback: (progress) => {
        this.setState({ ...this.state, progress: progress * 100 });
      }
    });

    fileDownload(file, filename);
  }

  render(): JSX.Element {
    return <></>;
  }
}

export default ShareView;