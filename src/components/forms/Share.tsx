import * as React from "react";
import fileDownload from 'js-file-download';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ShareProps {
    match: any
}

class Share extends React.Component<ShareProps> {
    state = {
        token: this.props.match.params.token,
        fileName: ''
    }

    IsValidToken = (token: string) => {
        return /^[a-z0-9]{10}$/.test(token);
    }

    isBase64(str) {
        try {
            return btoa(atob(str)) == str;
        } catch (err) {
            return false;
        }
    }

    componentDidMount() {
        if (this.IsValidToken(this.state.token)) {
            this.download();
        } else {
            toast.warn('Invalid token');
        }
    }

    download() {
        toast.info('Downloading file ...');

        fetch(`/api/storage/share/${this.state.token}`)
            .then((resp: Response) => {
                if (resp.status !== 200) { throw resp }

                var fileName = resp.headers.get('x-file-name');
                if ( fileName ) {
                    if (this.isBase64(fileName)) {
                        fileName = Buffer.from(fileName, 'base64').toString('utf8')
                    }
                    
                    this.setState({
                        fileName: fileName
                    });
                    return resp.blob();
                } else {
                    throw new Error;
                }
            })
            .then((blob: any) => {
                fileDownload(blob, this.state.fileName)
                toast.info('File has been downloaded!');
            })
            .catch((err: Response) => {
                if (err.status === 500) {
                    toast.warn('Unavailable token');    
                } else {
                    toast.warn('Error downloading file');    
                }
            });
    }

    render() {
        return "";
    }
}

export default Share;