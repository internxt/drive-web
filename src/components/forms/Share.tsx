import * as React from 'react';
import fileDownload from 'js-file-download';
import { toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Share.scss';
import { isMobile } from 'react-device-detect';
import { socket } from '../../lib/socket';

interface ShareProps {
    match?: any
}

class Share extends React.Component<ShareProps> {
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
      fileName: '',
      progress: 0,
      fileLength: 0,
      steps: {
        downloadingFromNet: true,
        sendingToBrowser: false,
        finished: false
      }
    }

    IsValidToken = (token: string) => {
      return /^[a-z0-9]{10}$/.test(token);
    }

    isBase64(str) {
      try {
        return btoa(atob(str)) === str;
      } catch (err) {
        return false;
      }
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

    setFileLength (fileLength) {
      this.setState({ ...this.state, fileLength });
    }

    setFileName (fileName) {
      this.setState({ ...this.state, fileName });
    }

    increaseProgress (increase) {
      const progress = this.state.progress + increase;

      this.setState({ ...this.state, progress });
    }

    IsSendingToBrowser () {
      toast.info('Downloading file!', {
        position: 'bottom-right',
        autoClose: false,
        draggable: false
      });
      this.setState({
        ...this.state,
        steps: { ...this.state.steps, sendingToBrowser: true }
      });
    }

    downloadIsFinished () {
      this.setState({
        ...this.state,
        steps: { ...this.state.steps, finished: true }
      });
    }

    handleSocketError (err) {
      toast.warn(err, {
        position: 'bottom-right',
        autoClose: false,
        draggable: false
      });
    }

    download() {
      const slices: ArrayBuffer [] = [];
      // let progress: number;

      toast.info('Securely retrieving file ...', {
        position: 'bottom-right',
        autoClose: false,
        draggable: false
      });

      const token = this.state.token;

      socket.emit('get-file-share', { token });

      socket.on(`get-file-share-${token}-length`, (fileLength) => this.setFileLength(fileLength));
      socket.on(`get-file-share-${token}-fileName`, (fileName) => this.setFileName(fileName));
      socket.on(`get-file-share-${token}-error`, (err) => this.handleSocketError(err));

      socket.on(`get-file-share-${token}-stream`, (chunk:ArrayBuffer) => {
        this.increaseProgress(((chunk.byteLength / this.state.fileLength) * 100));

        if (!this.state.steps.sendingToBrowser) {
          // prevent event to fire twice before react changes state.steps.sendingToBrowser to true.
          this.IsSendingToBrowser();
        }

        slices.push(chunk);
      });

      socket.on(`get-file-share-${token}-finished`, () => {
        const fileBlob = new Blob(slices);

        console.log('finished');
        if (!this.state.steps.finished) {
          this.downloadIsFinished();
          fileDownload(fileBlob, this.state.fileName);
        }
        socket.close();
      });
    }

    render() {
      return '';
    }
}

export default Share;