import * as React from 'react';
import fileDownload from 'js-file-download';
import { toast, ToastOptions } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import { isMobile } from 'react-device-detect';

import './ShareView.scss';
import { getShareInfo } from '../../services/share.service';
import { Network } from '../../lib/network';
import AesUtils from '../../lib/AesUtil';
import notify, { ToastType } from '../../components/Notifications';
import i18n from '../../services/i18n.service';

interface ShareViewProps {
  match?: any
}

interface ShareViewState {
  token: string;
  progress: number;
}

class ShareView extends React.Component<ShareViewProps, ShareViewState> {
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
      notify(i18n.get('error.linkExpired'), ToastType.Error);
    }
  }

  async download(): Promise<void> {
    const token = this.state.token;
    const shareInfo = await getShareInfo(token);

    notify(i18n.get('info.retrievingFile'), ToastType.Info);

    const salt = `${process.env.REACT_APP_CRYPTO_SECRET2}-${shareInfo.fileMeta.folderId.toString()}`;
    const decryptedFilename = AesUtils.decrypt(shareInfo.fileMeta.name, salt);
    const type = shareInfo.fileMeta.type;
    const filename = `${decryptedFilename}${type ? `.${type}` : ''}`;

    const network = new Network('NONE', 'NONE', 'NONE');

    notify(i18n.get('info.downloadingFile', { filename }), ToastType.Info);

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