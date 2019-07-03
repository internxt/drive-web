import React from 'react'
import Popup from 'reactjs-popup';
import './PopupShare.scss'
import { Row, Container, Col, Spinner } from 'react-bootstrap';

import CloseIcon from '../assets/Dashboard-Icons/close-tab.svg'

import copy from 'copy-to-clipboard';


class PopupShare extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            link: null
        }
    }

    generateShortLink = (url) => {
        return new Promise((resolve, reject) => {
            fetch(`${process.env.REACT_APP_SHORTER_API_URL}`, {
                method: 'POST',
                headers: {
                    'x-api-key': `${process.env.REACT_APP_SHORTER_API_KEY}`,
                    'Content-type': "application/json"
                },
                body: JSON.stringify({
                    "target": `${url}`,
                    "reuse": "false"
                })
            }).then(res => res.json())
                .then(res => {
                    resolve(res.shortUrl);
                }).catch(err => {
                    reject(err)
                });
        });
    }

    generateShareLink = (fileId) => {
        const headers = {
            Authorization: `Bearer ${localStorage.getItem("xToken")}`,
            "content-type": "application/json",
            "internxt-mnemonic": localStorage.getItem("xMnemonic")
        }

        return new Promise((resolve, reject) => {
            fetch(`/api/storage/share/file/${fileId}`, {
                method: 'POST',
                headers
            }).then(res => res.json())
                .then(res => {
                    var link = `${process.env.REACT_APP_PROXY_URL}/${process.env.REACT_APP_API_URL}/api/storage/share/${res.token}`
                    this.generateShortLink(link).then(res => {
                        resolve(res);
                    }).catch(err => {
                        reject(err);
                    });
                }).catch(err => {
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
                    <div className="ShareName"><p>{this.props.item.fileName}.{this.props.item.type}</p></div>
                    <div className="ShareClose"><img src={CloseIcon} onClick={e => { this.props.onClose() }} /></div>
                </div>

                <div className="ShareBody">
                    <div>Share your X Cloud file with this single-use private link</div>
                </div>

                <div className="ShareFooter">
                    <div className="ShareLink">{this.state.link == null ? <Spinner animation="border" size="sm" variant="secondary" /> : <p>{this.state.link}</p>}</div>
                    <div className="ShareCopy"><a onClick={(e) => {
                        if (this.state.link) {
                            copy(this.state.link)
                        }
                    }}>Copy</a></div>
                </div>
            </div>
        </Popup>

    }
}

export default PopupShare;