import React from 'react';
import { Container, Row, ProgressBar, Col, Card } from "react-bootstrap";

import './Plans.css'
import Circle from "./Circle";

import PrettySize from 'prettysize';

class Plans extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            PlanDetails: [],
            barLimit: 1024* 1024* 1024,
            barUsage: 0
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
            this.setState({ barLimit: res2.total })
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


    render() {
        return (
            <Container fluid>
                <Container className="mt-5" style={{ maxWidth: '784px' }}>
                    <h2><strong>Storage Space</strong></h2>
                    <p color="#404040" className="mt-3" style={{textAlign: 'right'}}>Used {PrettySize(this.state.barUsage)} of {PrettySize(this.state.barLimit)}</p>
                    <ProgressBar now={this.state.barUsage} max={this.state.barLimit}  />

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

                    <p className="delete-account">Permanently Delete Account</p>

                </Container>


            </Container>);
    }
};

export default Plans;