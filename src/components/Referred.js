import React from 'react';
import { Button, Container } from 'react-bootstrap';
import NavigationBar from './navigationBar/NavigationBar';
import './Referred.scss';
import { getHeaders } from '../lib/auth'

import twitter from '../assets/Share-Icons/Twitter.svg';
import facebook from '../assets/Share-Icons/Facebook.svg';
import telegram from '../assets/Share-Icons/Telegram.svg';
import copy from '../assets/copy-icon.svg';
import { toast } from 'react-toastify';


class Referred extends React.Component {
    state = {
        email: ''
    }

    constructor(props) {
        super(props);
        this.state = {value: ''};
        this.handleChange = this.handleChange.bind(this);
    }

    parseUrl(text) {
        return new URLSearchParams(text).toString()
    }

    handleChange = (event) => {
        this.setState({
          value: event.target.value
        });
    }

    sendClaimEmail = (email) => {
        fetch(`/api/user/claim`, {
            method: 'POST',
            headers: getHeaders(false, false),
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
            <NavigationBar navbarItems={<h5>Referred friends</h5>} showSettingsButton={true} />
            <Container className="referred-box">
                <div className="referred-title">Claim your credit</div>
                <div className="referred-description">Claim your reward for inviting your friends to our network.Claim your reward for inviting your friends to our network.Claim your reward for inviting your friends to our network.</div>

                <Container className="url-container">
                    <div className="referred-url">
                        <input type="text" readOnly value={`http://www.internxt.com/asdfdsafdsafdssdafdasfdsa/${user.uuid}`} />
                    </div>
                    <Button className="copy-button" type="button">
                        <img src={copy} alt="" />
                    </Button>
                </Container>
    
                <div></div>
                <Container className="social-container">
                    <Button className="social-button" type="button"
                            href={`https://twitter.com/intent/tweet?${this.parseUrl({text: 'Still havent known @Internxt? Register with my link and get benefits https://internxt.com/'})}`}
                            target="_blank"
                            data-size="large"
                            data-url={`https%3A%2F%2Finternxt.com%2Fasdfdsafdsafdssdafdasfdsa%2F${user.uuid}`}
                            data-lang="en">
                                <img src={twitter} alt="" />
                            </Button>
                    <Button className="social-button" type="button"
                            img src={facebook}
                            href={`https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Finternxt.com%2Fasdfdsafdsafdssdafdasfdsa%2F${user.uuid}&amp;src=sdkpreparse&${this.parseUrl({quote: 'Still havent known @Internxt? Register with my link and get benefits https://internxt.com/'})}`} target="_blank">
                                <img src={facebook} alt="" />
                            </Button>
                    <Button className="social-button" type="button"
                            img src={telegram}
                            href={`https://t.me/share/url?url=https%3A%2F%2Finternxt.com%2Fasdfdsafdsafdssdafdasfdsa%2F${user.uuid}&${this.parseUrl({text: 'Still havent known @Internxt? Register with my link and get benefits'})}`} target="_blank">
                                <img src={telegram} alt="" />
                            </Button>
                </Container>
                <div></div>

                <Container className="mail-container">
                    <div>
                        <input className="mail-box" type="email" value={this.state.email} onChange={this.handleChange} />
                    </div>
                    <Button className="send-button" type="button">
                        Send
                    </Button>
                </Container>

                <div className="user-credit">{`You have accumulated ${user.credit} €`}</div>

                <Button className="on btn-block referred-button" 
                        type="button"
                        onClick={() => {
                            this.sendClaimEmail(this.state.email);
                        }}>
                        Claim
                </Button>
            </Container>
            
        </div>
    }
}

export default Referred;