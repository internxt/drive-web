import React from 'react';
import NavigationBar from './navigationBar/NavigationBar';
import PayMethods from './PayMethods';
import "./Storage.scss";
import history from '../lib/history';
import InxtContainer from './InxtContainer'
import './Plans.css'
import StorageProgressBar from './StorageProgressBar';
import StoragePlans from './StoragePlans'
import PrettySize from 'prettysize'

import Circle from './Circle'
import { Row, Col } from 'react-bootstrap';
import Popup from 'reactjs-popup';

import closeTab from '../assets/Dashboard-Icons/close-tab.svg';

import { getHeaders } from '../lib/auth'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class Storage extends React.Component {
    state = {
        page: null,
        max: 0,
        now: 0,

        modalDeleteAccountShow: false
    }

    componentDidMount() {
        // Check auth and redirect to login if necessary
        if (!localStorage.xUser) {
            history.push('/login');
        } else {
            this.usageLoader();
        }
    }

    payMethodLoader = (plan) => {
        if (plan.stripe_plan_id != null) {
            this.setState({
                page: <PayMethods choosedPlan={plan} />
            });
        }
    }

    usageLoader = () => {
        fetch('/api/limit', {
            method: 'get',
            headers: getHeaders(true, false)
        }
        ).then(res => {
            return res.json();
        }).then(res1 => {

            fetch('/api/usage', {
                method: 'get',
                headers: getHeaders(true, false)
            }).then(res => res.json())
                .then(res2 => {
                    this.setState({ 
                        max: res1.maxSpaceBytes,
                        now: res2.total 
                    })
                }).catch(err => {
                    console.log('Error getting /api/usage for storage bar', err);
                });

        }).catch(err => {
            console.log('Error getting /api/limit for storage bar', err);
        });
    }

    handleCancelAccount = () => {
        fetch('/api/deactivate', {
            method: 'GET',
            headers: getHeaders(true, false)
        })
            .then(res => res.json())
            .then(res => {
                this.setState({ modalDeleteAccountShow: false });
            }).catch(err => {
                toast.warn('Error deleting account');
                console.log(err);
            });
    }


    render() {
        return (
            <div className="settings">
                <NavigationBar navbarItems={<h5>Storage</h5>} showSettingsButton={true} />
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
                        <div className="message-wrapper">
                            <h1>Are you sure?</h1>
                            <p className="delete-account-advertising">All your files will be gone forever and you will lose access to your Internxt Drive account. Any active subscriptions you might have will also be cancelled. Once you click delete account, you will receive a confirmation email.</p>
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
