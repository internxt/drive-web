import * as React from "react";
import { Alert, Container } from 'react-bootstrap';
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

    componentDidMount() {
        if (this.IsValidToken(this.state.token)) {
            this.download();
        } else {
            toast.warn('Invalid token');
        }
    }

    download() {
        toast.info('Downloading file..');

        fetch(`${process.env.REACT_APP_API_URL}/api/storage/share/${this.state.token}`)
            .then((resp: Response) => {
                if (resp.status !== 200) { throw resp }
                
                const fileName = resp.headers.get('x-file-name');
                if ( fileName ) {
                    this.setState({
                        fileName: decodeURIComponent(escape(window.atob( fileName )))
                    });
                    return resp.blob();
                } else {
                    throw new Error;
                }
            })
            .then((blob: any) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                
                a.style.display = 'none';
                a.href = url;
                a.download = this.state.fileName;
                document.body.appendChild(a);
                a.click();
                
                toast.info('File has been downloaded!');
                window.URL.revokeObjectURL(url);
            })
            .catch((err: Response) => {
                if (err.status === 500) {
                    toast.warn('Unavailable token');    
                } else {
                    toast.warn('Error downloading file..');    
                }
            });
    }

    render() {
        return "";
        return <Container>
                    <Alert variant="danger">
                        ddddd
                    </Alert>
                </Container>;
    }
}

export default Share;