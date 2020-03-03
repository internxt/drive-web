import React from 'react'
import Popup from 'reactjs-popup';
import './PopupShare.scss'
import history from '../history'

import CloseIcon from '../assets/Dashboard-Icons/close-tab.svg'

import copy from 'copy-to-clipboard';
import { getHeaders } from '../lib/auth'

interface PopupShareProps {
    onClose: any
    item: any
    open: any
}

class PopupShare extends React.Component<PopupShareProps> {
    state = {
        link: null
    }

    generateShortLink = (url: string) => {
        return new Promise((resolve, reject) => {
            fetch(`${process.env.REACT_APP_SHORTER_API_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': `${process.env.REACT_APP_SHORTER_API_KEY}`,
                    'Content-type': "application/json"
                },
                body: JSON.stringify({ 'target': `${url}`, 'reuse': 'false' })
            }).then(res => res.json()).then(res => { resolve(res.shortUrl) }).catch(reject);
        });
    }

    generateShareLink = (fileId: string) => {
        return new Promise((resolve, reject) => {
            fetch(`/api/storage/share/file/${fileId}`, {
                method: 'POST',
                headers: getHeaders(true, true)
            }).then((res: Response) => {
                if (res.status !== 200) { throw res }
                return res.json()
            }).then((res: any) => {
                var link = `${process.env.REACT_APP_PROXY_URL}/${process.env.REACT_APP_API_URL}/api/storage/share/${res.token}`
                this.generateShortLink(link).then(resolve).catch(reject)
            }).catch((err: Response) => {
                if (err.status === 401) { history.push('/login') }
                reject(err);
            });
        });
    }

    componentDidMount() {
        this.generateShareLink(this.props.item.fileId).then(link => {
            this.setState({ link: link });
        });
    }

    render() {
        return <Popup open={this.props.open} onClose={this.props.onClose}>
            <div className="ShareContainer">

                <div className="ShareHeader">
                    <div>
                        <div className="Icon">
                            <div className="Extension">{this.props.item.type.toUpperCase()}</div>
                        </div>
                    </div>
                    <div className="ShareName"><p>{this.props.item.name}.{this.props.item.type}</p></div>
                    <div className="ShareClose"><img src={CloseIcon} onClick={e => { this.props.onClose() }} alt="Close" /></div>
                </div>

                <div className="ShareBody">
                    <div>Share your X Cloud file with this single-use private link</div>
                </div>

                <div className="ShareFooter">
                    <div className="ShareLink">{this.state.link == null ? <p>Loading...</p> : <p>{this.state.link}</p>}</div>
                    <div className="ShareCopy"><a href="# " onClick={(e) => {
                        if (this.state.link) {
                            copy('Hello,\nHow are things going? I’m using X Cloud, a secure, simple, private and eco-friendly cloud storage service https://internxt.com/cloud\n\nI wanted to share a file (signature) with you through this single-use private link -no sign up required: ' + this.state.link + '')
                        }
                    }}>Copy</a></div>
                </div>
            </div>
        </Popup>

    }
}

export default PopupShare;