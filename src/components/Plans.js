import Header from "../Header";
import React, { Component } from 'react';
import NavigationBar from "./NavigationBar";
import { Container, Row, ProgressBar, Col, Card } from "react-bootstrap";

import './Plans.css'
import Circle from "./Circle";

const PlanDetails = [
    {
        price: 0,
        space: '1GB'
    },
    {
        price: 4.49,
        space: '100GB'
    },
    {
        price: 9.45,
        space: '1TB'
    }
];

const Plans = (props) =>
    <Container fluid>

        <NavigationBar navbarItems={<h3>Settings</h3>} />

        <Container className="mt-3" style={{maxWidth: '784px'}}>
            <h2><strong>Storage Space</strong></h2>
            <p color="#404040" className="mt-3">Used storage space</p>
            <ProgressBar now={60} />


            <Row className="mt-3">
                <Col xs={12} md={6} sm={6}>
                    <Circle color="#007bff" /> Used storage space (8GB)
                </Col>
                
                <Col xs={12} md={6} sm={6}>
                    <Circle color="#e9ecef" /> Unused storage space (1GB)
                </Col>
            </Row>

            <hr className="mt-5" />

            <h2 className="mt-4">
                <strong>Storage Plans</strong>
            </h2>

            <Row className="mt-4">
                {PlanDetails.map(entry => <Col xs={12} md={4} sm={6}>
                    <Card>
                        <Card.Header><h2>{entry.space}</h2></Card.Header>
                        <Card.Text>{entry.price == 0 ? 'Free' : '€' + entry.price + ' per month' }</Card.Text>
                    </Card>
                </Col>)}
            </Row>

            <hr />

            <p>Permanently Delete Account</p>

        </Container>


    </Container>
    ;

export default Plans;