import React from 'react';
import { Container, Row, ProgressBar, Col, Card, Modal, Button } from "react-bootstrap";

import './Plans.css'
import Circle from "./Circle";

import PrettySize from 'prettysize';

import logo from '../assets/logo.svg';
import closeTab from '../assets/Dashboard-Icons/Close tab.svg';
import Popup from "reactjs-popup";


class Plans extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            PlanDetails: [],
            barLimit: 1024 * 1024 * 1024,
            barUsage: 0,
            modalDeleteAccountShow: false
        }
    }

    componentDidMount() {

        // Load current plans

        fetch('/api/plans', {
            method: 'post'
        }).then(response => {
            return response.json();
        }).then(pay => {
            this.setState({
                PlanDetails: pay
            });
        });

        // Load current usage

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
            this.setState({ barLimit: res2.maxSpaceBytes })
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
        ).then(res => {
            return res.json();
        }).then(res2 => {
            this.setState({ barUsage: res2.total })
        }).catch(err => {
            console.log(err);
        });

    }

    handleDismissDeleteAccount = () => {
        this.setState({ modalDeleteAccountShow: false });
    }

    handleCancelAccount = () => {
        fetch('/api/deactivate', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${localStorage.getItem("xToken")}`,
                "content-type": "application/json; charset=utf-8"
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
            <Container fluid>
                <Container className="mt-5" style={{ maxWidth: '784px' }}>
                    <h2><strong>Storage Space</strong></h2>
                    <p color="#404040" className="mt-3" style={{ textAlign: 'right' }}>Used {PrettySize(this.state.barUsage)} of {PrettySize(this.state.barLimit)}</p>
                    <ProgressBar now={this.state.barUsage} max={this.state.barLimit} />

                    <Row className="mt-3">
                        <Col xs={12} md={6} sm={6}>
                            <Circle color="#007bff" /> Used storage space
                        </Col>

                        <Col xs={12} md={6} sm={6}>
                            <Circle color="#e9ecef" /> Unused storage space
                        </Col>
                    </Row>

                    <hr className="settings-hr-first" />

                    <h2 className="mt-4">
                        <strong>Storage Plans</strong>
                    </h2>

                    <Row className="mt-4">
                        {this.state.PlanDetails.map(entry => <Col xs={12} md={4} sm={6}>
                            <Card onClick={(e) => { this.props.planHandler(entry); }}>
                                <Card.Header><h2>{entry.name}</h2></Card.Header>
                                <Card.Text>{entry.price_eur == 0 ? 'Free' : '€' + entry.price_eur + ' per month'}</Card.Text>
                            </Card>
                        </Col>)}
                    </Row>

                    <hr className="settings-hr-end" />

                    <a className="delete-account" onClick={e => {
                        this.setState({ modalDeleteAccountShow: true });
                    }}>Permanently Delete Account</a>

                    <Modal show={this.state.modalDeleteAccountShow2} onHide={this.handleDismissDeleteAccount}>
                        <Modal.Header closeButton>Permanently delete account</Modal.Header>
                        <Modal.Body>
                            <p>You are about to permanently delete this account and the subcription if you have one.</p>
                            <p>If you confirm you want to remove your account, a confirmation email will be sent to your inbox.</p>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="primary" onClick={this.handleDismissDeleteAccount}>Do not remove</Button>
                            <Button variant="danger" onClick={this.handleCancelAccount}>Confirm delete</Button>
                        </Modal.Footer>
                    </Modal>

                    <Popup open={this.state.modalDeleteAccountShow} onClose={this.handleDismissDeleteAccount} className="popup--full-screen">
                        <div className="popup--full-screen__content delete-account-specific">
                            <div className="popup--full-screen__close-button-wrapper">
                                <img src={closeTab} onClick={this.handleDismissDeleteAccount} />
                            </div>
                            <span className="logo logo-delete-account"><img src={logo} /></span>
                            <div className="message-wrapper">
                                <h1>Are you sure?</h1>
                                <p className="delete-account-advertising">Deleting your account means all your files will be gone forever and you will lose access to your X Cloud account. Once you click delete account, you will receive a confirmation email.</p>
                                <p className="delete-account-info">Before deleting your account we may be able to help you. <a href="mailto:hello@internxt.com" class="reach-to-us">Reach out to us</a>.</p>
                                <div className="buttons-wrapper">
                                    <div className="default-button button-primary delete-account-button" onClick={this.handleCancelAccount}>
                                        Delete account
                                    </div>
                                </div>

                            </div>
                        </div>
                    </Popup>

                </Container>


            </Container>);
    }
};

export default Plans;