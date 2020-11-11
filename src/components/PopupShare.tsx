import React from 'react'
import Popup from 'reactjs-popup';
import './PopupShare.scss'
import history from '../lib/history'

import CloseIcon from '../assets/Dashboard-Icons/close-tab.svg'
import FolderBlueIcon from '../assets/Folders/Folder-Blue.svg'

import copy from 'copy-to-clipboard';
import { getHeaders } from '../lib/auth'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { analytics } from '../lib/analytics'
import { clearTimeout, setTimeout } from 'timers';

interface PopupShareProps {
    onClose: any
    item: any
    open: any
}

class PopupShare extends React.Component<PopupShareProps> {
    state = {
        link: null,
        views: 1
    }

    generateShortLink = (url: string) => {
        return new Promise((resolve, reject) => {
            fetch('/api/storage/shortLink', {
                method: 'POST',
                headers: getHeaders(true, true),
                body: JSON.stringify({ 'url': url })
            }).then(res => res.json()).then(res => { resolve(res.shortUrl) }).catch(reject);
        });
    }

    generateShareLink = (fileId: string, views: Number) => {
        return new Promise((resolve, reject) => {
            fetch(`/api/storage/share/file/${fileId}`, {
                method: 'POST',
                headers: getHeaders(true, true),
                body: JSON.stringify({
                    'isFolder': this.props.item.isFolder ? 'true' : 'false',
                    'views': views
                })
            }).then((res: Response) => {
                if (res.status !== 200) { throw res }
                return res.json()
            }).then((res: any) => {
                // var link = `${process.env.REACT_APP_PROXY_URL}/${process.env.REACT_APP_API_URL}/api/storage/share/${res.token}`
                // this.generateShortLink(link).then(resolve).catch(reject)
                var link = `${window.location.origin}/${res.token}`;
                resolve(link);
            }).catch((err: Response) => {
                if (err.status === 401) { history.push('/login') }
                reject(err);
            });
        });
    }

    componentDidMount() {
        this.handleShareLink(1)
    }

    timeout: NodeJS.Timeout = setTimeout(() => { }, 0);
    handleChange(e) {
        const views = e.currentTarget.value
        clearTimeout(this.timeout)
        this.timeout = setTimeout(() => {
            this.handleShareLink(parseInt(views));
        }, 750)
    }

    handleShareLink(views: Number) {
        let fileId = this.props.item.isFolder ? this.props.item.id : this.props.item.fileId;
        if (!this.props.item.isFolder && this.props.item.isDraggable === false) {
            return this.setState({
                link: 'https://internxt.com/Internxt.pdf'
            })
        }

        this.generateShareLink(
            fileId, views
        ).then(link => {
            analytics.track('file-share')
            this.setState({ link: link });
        }).catch((err) => {
            if (err.status === 402) {
                let itemType = this.props.item.isFolder ? 'older' : 'ile';
                this.setState({ link: 'Unavailable link' });
                toast.warn(`F${itemType} too large.\nYou can only share f${itemType}s of up to 200 MB through the web app`);
            }
        });
    }

    render() {
        const fileType = this.props.item.isFolder ? '' : this.props.item.type.toUpperCase();
        const fileName = this.props.item.isFolder ? this.props.item.name : `${this.props.item.name}.${this.props.item.type}`;

        return <Popup open={this.props.open} onClose={this.props.onClose}>
            <div className="ShareContainer">

                <div className="ShareHeader">
                    <div>
                        <div className={this.props.item.isFolder ? 'Icon-image' : 'Icon'}>
                            {
                                this.props.item.isFolder ?
                                    <img src={FolderBlueIcon} className="Folder" alt="Folder" />
                                    : <div className="Extension">{fileType}</div>
                            }

                        </div>
                    </div>
                    <div className="ShareName"><p>{fileName}</p></div>
                    <div className="ShareClose"><img src={CloseIcon} onClick={e => { this.props.onClose() }} alt="Close" /></div>
                </div>

                <div className="ShareBody">
                    <div>
                        Share your Drive {this.props.item.isFolder ? 'folder' : 'file'} with this private link. Or enter
                        the number of times you'd like the link to be valid:&nbsp;&nbsp;
                        <input type="number" defaultValue={this.state.views} size={3}
                            step="1"
                            min="1"
                            onChange={this.handleChange.bind(this)}
                            style={{
                                width: '50px',
                                display: 'inline',
                                border: 'none',
                                color: '#5c6066',
                                backgroundColor: '#f8f9fa',
                                textAlign: 'center',
                                borderRadius: '3.9px',
                                appearance: 'textfield'
                            }}>
                        </input>
                    </div>
                </div>

                <div className="ShareFooter">
                    <div className="ShareLink">{this.state.link == null ? <p>Loading...</p> : <p>{this.state.link}</p>}</div>
                    <div className="ShareCopy"><a href="# " onClick={(e) => {
                        if (this.state.link) {
                            copy('Hello,\nHow are things going? I’m using Internxt Drive, a secure, simple, private and eco-friendly cloud storage service https://internxt.com/drive\nI wanted to share a file with you through this direct secure link: ' + this.state.link + '')
                        }
                    }}>Copy</a></div>
                </div>
            </div>
        </Popup>

    }
}

export default PopupShare;