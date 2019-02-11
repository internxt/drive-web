import React from 'react';
import { Container, Form, FormText, Row, Col, Button } from 'react-bootstrap';

const CreditCard = props =>
    <Container className="mt-5">
        <h3>Enter your card details.</h3>
        <Form>
            <Row>
                <Col>
                    <Form.Control size="lg" type="text" placeholder="Card holder's name" />
                </Col>
                <Col>
                    <Form.Control size="lg" type="text" placeholder="Card number" />
                </Col>
            </Row>
            <Row className="mt-4">
                <Col>
                    <Form.Control size="lg" type="text" placeholder="Card expiration date" />
                </Col>
                <Col>
                    <Form.Control size="lg" type="text" placeholder="CVC number" />
                </Col>
            </Row>

            <Form.Check type="checkbox" label="I agree to the X Cloud Terms" />

            <Button variant="primary" type="submit" block size="lg" className="mt-4">Buy now</Button>
        </Form>
    </Container>;

export default CreditCard;