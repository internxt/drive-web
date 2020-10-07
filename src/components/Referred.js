import React from 'react';
import { Button, Container, Dropdown, DropdownButton, Form } from 'react-bootstrap';
import NavigationBar from './navigationBar/NavigationBar';
import './Referred.scss';
import { getHeaders } from '../lib/auth';


import twitter from '../assets/Share-Icons/Twitter.svg';
import facebook from '../assets/Share-Icons/Facebook.svg';
import telegram from '../assets/Share-Icons/Telegram.svg';

import { toast } from 'react-toastify';
import copy from 'copy-to-clipboard';


class Referred extends React.Component {
    state = {
        email: '',
        credit: 0,
        textToCopy: '',
        copySuccess: '',
        isOpen: false,
        text: ''
    }

    constructor(props) {
        super(props);
        this.state = { value: '' };

        this.handleEmailChange = this.handleEmailChange.bind(this);
    }

    componentDidMount() {
        const user = JSON.parse(localStorage.getItem('xUser') || '{}');
        this.getCredit();
        this.setState({ textToCopy: `https://internxt.com/?ref=${user.uuid}` });
        this.setState({ copySuccess: 'Copy' });
        const socialText = this.parseUrl('I\'ve made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 2 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!');
        this.setState({ text: socialText });
    }

    getCredit = () => {
        fetch(`/api/user/credit`, {
            method: 'GET',
            headers: getHeaders(true, false)
        }).then(async res => {
            if (res.status !== 200) {
                throw res
            }
            return { response: res, data: await res.json() };
        })
            .then(async ({ res, data }) => {
                const credit = data.userCredit;
                this.setState({ credit: credit });

                console.log(this.state.credit);
            }).catch(err => {
                console.log("Hola desde el error", err);
            });
    }

    parseUrl(text) {
        return new URLSearchParams(text).toString()
    }

    validateEmail = (email) => {
        // eslint-disable-next-line no-control-regex
        const emailPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/
        return emailPattern.test(email.toLowerCase());
    }

    copyToClipboard = () => {
        this.setState({ copySuccess: 'Copied' });
        copy(this.state.textToCopy);
    }

    handleEmailChange = (event) => {
        this.setState({
            email: event.target.value
        });
    }

    handleClick = (e) => {
        e.preventDefault();
        this.setState({ isOpen: !this.state.isOpen });
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
                toast.info(`Invitation email sent to ${mail}`);
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
                toast.info(`Claim email sent to hello@internxt.com`);
            }
        }).catch(err => {
            toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
        });
    }

    render() {
        const user = JSON.parse(localStorage.getItem('xUser') || '{}');

        return <div>
            <NavigationBar navbarItems={<h5>Referrals</h5>} showSettingsButton={true} />
            <div className="Referred">
                <Container className="referred-box p-5">
                    <div className="referred-title">Earn money by referring friends</div>
                    <div className="referred-description py-3">Invite friends who aren't on Internxt yet. You'll both get €5 of Internxt credit as soon as they activate their account. Start earning money today!</div>

                    <Container className="mail-container mt-3">
                        <div className="row">
                            <div className="col-10 pl-0">
                                <Form.Control className="mail-box" type="email" placeholder="example@example.com" value={this.state.email} onChange={this.handleEmailChange} />
                            </div>
                            <Button className="invite-button col-2" type="button" onClick={() => {
                                const mail = this.state.email;
                                if (mail !== undefined && this.validateEmail(mail)) {
                                    this.setState({ email: '' });
                                    this.sendInvitationEmail(mail);
                                } else {
                                    toast.warn(`Please, enter a valid email before sending out the invite`);
                                }
                            }}>Invite</Button>
                        </div>
                    </Container>
                    <Container className="row m-0 mt-4 p-0">
                        <div className="col-8 px-0">
                            <div className="referred-url">
                                <input type="text" readOnly value={`https://internxt.com/?ref=${user.uuid}`} />
                            </div>
                        </div>
                        <div className="col-2 px-0 mx-0 d-flex">
                            <Button type="button" className="copy-button m-auto" onClick={this.copyToClipboard}>
                                {this.state.copySuccess}
                            </Button>
                        </div>
                        <div className="col-2 d-flex p-0">
                            <DropdownButton className="share-container m-auto" name="menuShare" title="Share" type="toggle">
                                <Dropdown.Item className="social-button"
                                    href={`https://twitter.com/intent/tweet?url=https://internxt.com/?ref=${user.uuid}&${this.parseUrl({ text: 'I\'ve made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 2 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!' })}`}
                                    target="_blank"
                                    data-size="large"
                                    original-referer={`https://internxt.com/?ref=${user.uuid}`}
                                    data-lang="en">
                                    <img src={twitter} alt="" />
                                </Dropdown.Item>
                                <Dropdown.Item className="social-button" data-href={`https://internxt.com/?ref=${user.uuid}`}
                                    href={`https://www.facebook.com/sharer/sharer.php?u=https://internxt.com/?ref=${user.uuid}&amp;src=sdkpreparse&${this.parseUrl({ quote: 'I\'ve made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 2 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!' })}`} target="_blank">
                                    <img src={facebook} alt="" />
                                </Dropdown.Item>
                                <Dropdown.Item className="social-button"
                                    href={`https://t.me/share/url?${this.parseUrl({ text: 'I\'ve made the switch to @Internxt a secure and free alternative to Dropbox that truly respects your privacy. Sign up using this exclusive link and get 2 GB free for life, and €5 that can be used if you ever decide to upgrade your Internxt storage plan!' })}&url=https://internxt.com/?ref=${user.uuid}`} target="_blank">
                                    <img src={telegram} alt="" />
                                </Dropdown.Item>
                            </DropdownButton>
                        </div>
                    </Container>

                    <div className="user-credit py-4">{`You have accumulated €${this.state.credit} `}</div>

                    <Button block className="referred-button"
                        type="button"
                        onClick={() => {
                            if (user.credit > 0) {
                                this.sendClaimEmail(this.state.email);
                            } else {
                                toast.info(`You don't have any credit on your account`);
                            }
                        }}>
                        Claim
                    </Button>
                </Container>
            </div>
        </div>
    }
}

export default Referred;