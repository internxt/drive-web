import * as React from 'react';
import fileDownload from 'js-file-download';

import 'react-toastify/dist/ReactToastify.css';
import * as Unicons from '@iconscout/react-unicons';
import { isMobile } from 'react-device-detect';

import './ShareView.scss';
import { getShareInfo, GetShareInfoResponse } from '../../services/share.service';
import { Network } from '../../lib/network';
import AesUtils from '../../lib/AesUtil';
import i18n from '../../services/i18n.service';
import { ReactComponent as Spinner } from '../../assets/icons/spinner.svg';
import { ReactComponent as Logo } from '../../assets/icons/big-logo.svg';
import iconService from '../../services/icon.service';
import BaseButton from '../../components/Buttons/BaseButton';
import sizeService from '../../services/size.service';

interface ShareViewProps {
  match?: any
}

interface GetShareInfoWithDecryptedName extends GetShareInfoResponse {
  decryptedName: string | null;
}

interface ShareViewState {
  token: string;
  progress: number;
  info: GetShareInfoWithDecryptedName | null;
  linkExpired:boolean;
  accessedFile: boolean;
}

class ShareView extends React.Component<ShareViewProps, ShareViewState> {
  state = {
    token: this.props.match.params.token,
    progress: 0,
    info: null,
    linkExpired: false,
    accessedFile: false
  }

  componentDidMount() {
    if (isMobile) {
      window.location.href = `https://api.internxt.com:8081/https://drive.internxt.com/api/storage/share/${this.state.token}`;
    }
  }

  loadInfo = async (): Promise<void> =>{
    const token = this.state.token;

    const info:any = await getShareInfo(token);

    this.setState({
      accessedFile:true
    });

    if (info.error) {
      this.setState({
        linkExpired:true
      });
    } else {
      info.decryptedName = this.getDecryptedName(info);
      this.setState({
        info
      });
    }
  }

  download = async (): Promise<void> => {
    const info = this.state.info as unknown as GetShareInfoWithDecryptedName | null;

    const MIN_PROGRESS = 5;

    if (info){
      const network = new Network('NONE', 'NONE', 'NONE');

      this.setState({ progress:MIN_PROGRESS });

      const file = await network.downloadFile(info.bucket, info.file, {
        fileEncryptionKey: Buffer.from(info.encryptionKey, 'hex'),
        fileToken: info.fileToken,
        progressCallback: (progress) => {
          this.setState({ ...this.state, progress: Math.max(MIN_PROGRESS, progress * 100) });
        }
      });

      fileDownload(file, info.decryptedName as string);
    }
  }

  getDecryptedName(info: GetShareInfoWithDecryptedName){

    const salt = `${process.env.REACT_APP_CRYPTO_SECRET2}-${info.fileMeta.folderId.toString()}`;
    const decryptedFilename = AesUtils.decrypt(info.fileMeta.name, salt);
    const type = info.fileMeta.type;

    return `${decryptedFilename}${type ? `.${type}` : ''}`;

  }

  render(): JSX.Element {
    let body;

    if (!this.state.accessedFile){
      body =
          <BaseButton onClick={this.loadInfo} classes="bg-blue-60 text-white font-bold p-5">{i18n.get('action.accessFile')}</BaseButton>;
    } else if (this.state.linkExpired){
      body = <p className="text-lg text-red-70">{i18n.get('error.linkExpired')}</p>;
    } else if (this.state.info){
      const info = this.state.info as unknown as GetShareInfoWithDecryptedName;

      const formattedSize = sizeService.bytesToString(info.fileMeta.size);

      const ItemIconComponent = iconService.getItemIcon(false, info.fileMeta.type);

      const { progress } = this.state;

      const progressBarPixelsTotal = 100;
      const progressBarPixelsCurrent = progress * progressBarPixelsTotal / 100;

      const ProgressComponent = progress < 100 ?
        (<div style={{ width:`${progressBarPixelsTotal}px` }}><div style={{ width: `${progressBarPixelsCurrent}px` }} className="border-t-8 rounded border-l-neutral-50 transition-width duration-1000"></div></div>)
        : <Unicons.UilCheck className="text-green-50" height="40" width="40"></Unicons.UilCheck>;

      const DownloadButton =
          <BaseButton onClick={this.download} classes="bg-blue-60 text-white font-bold p-5">{i18n.get('action.download')}</BaseButton>;

      body =
        <div className="bg-white w-full mx-5 md:w-1/2 xl:w-1/4 border border-solid rounded border-l-neutral-50 flex flex-col items-center justify-center py-8" style={{ minHeight:'40%' }}>
          <div className="flex items-center"><ItemIconComponent className="mr-5"></ItemIconComponent> <h1 className="text-2xl">{info.decryptedName}</h1></div>
          <p className="text-l-neutral-50 text-sm mt-1">{formattedSize}</p>
          <div className="h-12 mt-5">
            {progress ? ProgressComponent : DownloadButton}
          </div>
        </div>;

    } else {
      body= <Spinner className="fill-current animate-spin h-16 w-16"/>;
    }

    return <div className="flex justify-center items-center h-screen bg-gray-10 relative">
      <Logo className="absolute top-5 left-5 h-auto w-32"></Logo>
      {body}
    </div>;
  }
}

export default ShareView;