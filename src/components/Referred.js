import React from 'react';
import { Button, Container } from 'react-bootstrap';
import NavigationBar from './navigationBar/NavigationBar';
import './Referred.scss';

import twitter from '../assets/Share-Icons/Twitter.svg';
import facebook from '../assets/Share-Icons/Facebook.svg';
import telegram from '../assets/Share-Icons/Telegram.svg';
import copy from '../assets/copy-icon.svg';


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
                    <Button className="send-button" type="button">Send
                    </Button>
                </Container>

                <div className="user-credit" /* TODO: Calcular credito*/ >You have accumulated 15 €</div>

                <Button className="on btn-block referred-button" 
                        type="button"
                        href='mailto:hello@internxt.com?Subject=Referred friends credits&Body=Hello Internxt! I am ready to receive my credit for referring friends'
                        >Claim</Button>
            </Container>
            
        </div>
    }
}

export default Referred;