import React from 'react';
import { Button, Container, Dropdown, DropdownButton, Nav } from 'react-bootstrap';
import NavigationBar from './navigationBar/NavigationBar';
import './Referred.scss';
import { getHeaders } from '../lib/auth';


import twitter from '../assets/Share-Icons/Twitter.svg';
import facebook from '../assets/Share-Icons/Facebook.svg';
import telegram from '../assets/Share-Icons/Telegram.svg';

import { toast } from 'react-toastify';
import { copyToClipboard } from '../lib/utils';


class Referred extends React.Component {
    state = {
        email: '',
        credit: 0
    }

    constructor(props) {
        super(props);
        this.state = {value: ''};
        this.handleEmailChange = this.handleEmailChange.bind(this);
    }

    componentDidMount() {
        const user = JSON.parse(localStorage.getItem('xUser') || '{}');
        this.getCredit(user.uuid);
    }

    getCredit = (userUuid) => {
        fetch(`/api/user/referred/${userUuid}`, {
            method: 'GET',
            headers: getHeaders(true, false)            
        }).then(async res => {
            if (res.status !== 200) {
                throw res
            }
            return { response: res, data: await res.json() };
        }).catch(err => {
            console.log("Hola desde el error", err);
        });
    } 

    parseUrl(text) {
        return new URLSearchParams(text).toString()
    }

    validateEmail = (email) => {
        const emailPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/
        return emailPattern.test(email.toLowerCase());
    }

    handleEmailChange = (event) => {
        this.setState({
          email: event.target.value
        });
    }

    sendInvitationEmail = (mail) => {
        fetch('/api/user/invite', {
            method: 'POST',
            headers: getHeaders(true, false),
            body: JSON.stringify({ email: mail })
        }).then(async res => {
            return { response: res, data: await res.json() };
        }).then(res => {
            if (res.response.status !== 200) {
                throw res.data;
            } else {
                toast.warn(`Invitation email sent to ${mail}`);
            }
        }).catch(err => {
            toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
        });
    }

    sendClaimEmail = () => {
        fetch('/api/user/claim', {
            method: 'POST',
            headers: getHeaders(true, false),
            body: JSON.stringify({ email: this.state.email })
        }).then(async res => {
            return { response: res, data: await res.json() };
        }).then(res => {
            if (res.response.status !== 200) {
                throw res.data;
            } else {
                toast.warn(`Claim email sent to hello@internxt.com`);
            }
        }).catch(err => {
            toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
        });
    }

    render() {
        const user = JSON.parse(localStorage.getItem('xUser') || '{}');

        return <div className="Referred">
            <NavigationBar navbarItems={<h5>Referrals</h5>} showSettingsButton={true} />
            <Container className="referred-box">
                <div className="referred-title">Earn money by referring friends</div>
                <div className="referred-description">Invite friends who aren't on Internxt yet to upgrade their Internxt account for free the first month, cancel anytime. You'll both get €5 of Internxt credit as soon as they activate their free premium trial. Start earning money today!</div>

                <Container className="mail-container">
                    <div>
                        <input className="mail-box" type="email" placeholder="example@example.com" value={this.state.email} onChange={this.handleEmailChange} />
                    </div>
                    <Button className="on btn-block send-button" type="button" onClick={() => {
                            const mail = this.state.email;
                            if (mail !== undefined && this.validateEmail(mail)) {
                                console.log("enviando")
                                this.sendInvitationEmail(mail);
                            } else {
                                toast.warn(`Please, enter a valid email to send invitation`);
                            }
                        }}>
                        Invite
                    </Button>
                </Container>
                <div></div>
                <Container className="url-container">
                    <div className="referred-url">
                        <input type="text" readOnly value={`https://internxt.com/?ref=${user.uuid}`} />
                    </div> 
                    <copyToClipboard className="copy-button" value={`https://internxt.com/?ref=${user.uuid}`} onCopy={this.onCopy}>
                        <Button type="button">
                            Copy
                        </Button>
                    </copyToClipboard>
                    <DropdownButton className="share-container" name="menuShare" title="Share" type="toggle">
                        <Dropdown.Item className="social-button"
                            href={`https://twitter.com/intent/tweet?${this.parseUrl({text: 'Still havent known @Internxt? Register with my link and get benefits '})}`}
                            target="_blank"
                            data-size="large"
                            data-url={`https://internxt.com/?ref=${user.uuid}`}
                            data-lang="en">
                                <img src={twitter} alt="" />
                        </Dropdown.Item>
                        <Dropdown.Item className="social-button"
                            href={`https://www.facebook.com/sharer/sharer.php?u=https://internxt.com/?ref=${user.uuid}&amp;src=sdkpreparse&${this.parseUrl({quote: 'Still havent known @Internxt? Register with my link and get benefits https://internxt.com/'})}`} target="_blank">
                                <img src={facebook} alt="" />
                        </Dropdown.Item>
                        <Dropdown.Item className="social-button"
                            href={`https://t.me/share/url?url=https://internxt.com/?ref=${user.uuid}&${this.parseUrl({text: 'Still havent known @Internxt? Register with my link and get benefits'})}`} target="_blank">
                                <img src={telegram} alt="" />
                        </Dropdown.Item>
                    </DropdownButton>
                </Container>
                
                <div></div>
                
                <div className="user-credit">{`You have accumulated ${user.credit} €`}</div>

                <Button className="on btn-block referred-button" 
                        type="button"
                        onClick={() => {
                            if (user.credit > 0) {
                                this.sendClaimEmail(this.state.email);
                            } else {
                                toast.warn(`You need to have credit to send claim`);
                            }
                        }}>
                        Claim
                </Button>
            </Container>
            
        </div>
    }
}

export default Referred;