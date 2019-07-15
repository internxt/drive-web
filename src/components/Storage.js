import React from 'react';
import NavigationBar from './navigationBar/NavigationBar';
import PayMethods from './PayMethods';
import "./Storage.css";
import history from '../history';
import InxtContainer from './InxtContainer'
import StorageProgressBar from './StorageProgressBar';
import StoragePlans from './StoragePlans'
import PrettySize from 'prettysize'

import Circle from './Circle'
import { Row, Col } from 'react-bootstrap';
import Popup from 'reactjs-popup';

import logo from '../assets/logo.svg';
import closeTab from '../assets/Dashboard-Icons/close-tab.svg';

import './Plans.css'

class Storage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            page: null,
            max: null,
            now: null,

            modalDeleteAccountShow: false
        }

    }

    componentDidMount() {
        // Check auth and redirect to login if necessary
        if (!this.props.isAuthenticated) {
            history.push('/login');
        } else {
            this.usageLoader();
        }
    }

    payMethodLoader = (plan) => {
        console.log(plan);
        if (plan.stripe_plan_id != null) {
            this.setState({
                page: <PayMethods choosedPlan={plan} />
            });
        }
    }

    usageLoader = () => {
        let user = JSON.parse(localStorage.xUser).email;

        fetch('/api/limit', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: user
            })
        }
        ).then(res => {
            return res.json();
        }).then(res2 => {
            this.setState({ max: res2.maxSpaceBytes })
        }).catch(err => {
            console.log(err);
        });

        fetch('/api/usage', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: user
            })
        }
        ).then(res => res.json())
            .then(res2 => {
                this.setState({ now: res2.total })
            }).catch(err => {
                console.log(err);
            });
    }

    handleCancelAccount = () => {
        fetch('/api/deactivate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("xToken")}`,
                'content-type': "application/json; charset=utf-8"
            }
        })
            .then(res => res.json())
            .then(res => {
                this.setState({ modalDeleteAccountShow: false });
            }).catch(err => {
                alert('Error deleting account');
                console.log(err);
            });
    }


    render() {
        return (
            <div className="settings">
                <NavigationBar navbarItems={<h5>Storage</h5>} showSettingsButton={true} showFileButtons={false} />
                <InxtContainer>
                    <p className="title">Storage Used</p>

                    <p className="space-used-text">Used <b>{PrettySize(this.state.now, true, false)}</b> of <b>{PrettySize(this.state.max, true, false)}</b></p>
                    <StorageProgressBar max={this.state.max} now={this.state.now} />

                    <Row className="space-used-legend">
                        <Col xs={12} md={4} sm={6}>
                            <Circle image="linear-gradient(59deg, #096dff, #00b1ff)" /> <span>Used storage space</span>
                        </Col>

                        <Col xs={12} md={6} sm={6}>
                            <Circle color="#e9ecef" /> <span>Unused storage space</span>
                        </Col>
                    </Row>
                </InxtContainer>

                <InxtContainer>
                    <StoragePlans currentPlan={this.state.max} />
                </InxtContainer>

                <p className="deleteAccount" onClick={e => {
                    this.setState({ modalDeleteAccountShow: true });
                }}>Permanently Delete Account</p>

                <Popup open={this.state.modalDeleteAccountShow} className="popup--full-screen">
                    <div className="popup--full-screen__content delete-account-specific">
                        <div className="popup--full-screen__close-button-wrapper">
                            <img src={closeTab} onClick={e => {
                                this.setState({ modalDeleteAccountShow: false });
                            }} alt="Close tab" />
                        </div>
                        <span className="logo logo-delete-account"><img src={logo} alt="Logo" /></span>
                        <div className="message-wrapper">
                            <h1>Are you sure?</h1>
                            <p className="delete-account-advertising">All your files will be gone forever and you will lose access to your X Cloud account. Any active subscriptions you might have if you are an X Cloud paying user will also be cancelled. Once you click delete account, you will receive a confirmation email.</p>
                            <p className="delete-account-info">Before deleting your account we may be able to help you. <a href="mailto:hello@internxt.com" className="reach-to-us">Reach out to us</a>.</p>
                            <div className="buttons-wrapper">
                                <div className="default-button button-primary delete-account-button"
                                    onClick={this.handleCancelAccount}>
                                    Delete account
                                    </div>
                            </div>

                        </div>
                    </div>
                </Popup>

            </div >
        );
    }
}

export default Storage;
