import * as React from "react";
import fileDownload from 'js-file-download';
import { toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { isMobile } from 'react-device-detect';

interface ShareProps {
    match: any
}

class Share extends React.Component<ShareProps> {
    toastOptions: ToastOptions = {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        pauseOnHover: true
    }

    state = {
        token: this.props.match.params.token,
        fileName: ''
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
            toast.warn('Invalid token', this.toastOptions);
        }
    }

    download() {
        const toastId = toast.info('Securely downloading file...', {
            position: "bottom-right",
            autoClose: false,
            draggable: false
        });
    
        fetch(`/api/storage/share/${this.state.token}`)
            .then((resp: Response) => {
                if (resp.status !== 200) { throw resp }

                var fileName = resp.headers.get('x-file-name');
                if (fileName) {
                    if (this.isBase64(fileName)) {
                        fileName = Buffer.from(fileName, 'base64').toString('utf8')
                    }

                    this.setState({
                        fileName: fileName
                    });
                    return resp.blob();
                } else {
                    throw resp;
                }
            })
            .then((blob: Blob) => {
                fileDownload(blob, this.state.fileName);
                toast.info('File has been downloaded!', this.toastOptions);
                toast.dismiss(toastId);
            })
            .catch((err: Response) => {
                if (err.status === 500) {
                    toast.warn('Unavailable token', this.toastOptions);
                } else {
                    toast.warn('Error downloading file', this.toastOptions);
                }

                toast.dismiss(toastId);
            });
    }

    render() {
        return "";
    }
}

export default Share;