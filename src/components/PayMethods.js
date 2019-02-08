import React, { Component } from 'react';
import { Container, Dropdown, Card, Row, Col } from 'react-bootstrap';
import NavigationBar from "./NavigationBar";
import './PayMethods.css';

const PayMethods = (props) =>
    <Container fluid>

        <NavigationBar navbarItems={<h3>Settings</h3>} />

        <Container className="mt-3" style={{ maxWidth: '784px' }}>
            <h2><strong>Choose a payment method.</strong></h2>


            <Row>
                <Col xs={12} md={4} sm={6}>
                    <Card><Card.Header><h5><strong>Credit Card</strong></h5></Card.Header></Card>
                </Col>

                <Col xs={12} md={4} sm={6}>
                    <Card><Card.Header><h5><strong>Paypal</strong></h5></Card.Header></Card>
                </Col>

                <Col xs={12} md={4} sm={6}>
                    <Card><Card.Header><h5><strong>INXT</strong></h5></Card.Header></Card>
                </Col>
            </Row>

        </Container>




    </Container>
    ;

export default PayMethods;