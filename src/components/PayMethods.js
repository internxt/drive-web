import React from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import './PayMethods.css';

import CreditCard from "./paymentBridges/CreditCard";
import PayPal from "./paymentBridges/PayPal";
import INXT from "./paymentBridges/INXT";

const AvailablePayMethods = [
    {
        name: 'Credit Card',
        component: <CreditCard />,
    },
    {
        name: 'PayPal',
        component: <PayPal />
    },
    {
        name: 'INXT',
        component: <INXT />
    }
];

class PayMethods extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            choosedPayMethod: null,
            choosedPlan: props.choosedPlan
        };

    }

    componentDidMount() {
        AvailablePayMethods.find(f => f.name === 'Credit Card').component = <CreditCard plan={this.state.choosedPlan} />
    }

    render() {
        return (
            <Container fluid>

                <Container className="mt-5" style={{ maxWidth: '784px' }}>
                    <Row>
                        <h2><strong>Choose a payment method.</strong></h2>
                    </Row>

                    <Row className="mt-5" className="payMethods">
                        {
                            AvailablePayMethods.map(method =>
                                <Col xs={12} md={4} sm={6} onClick={(e) => { this.setState({ choosedPayMethod: method.component }) }}>
                                    <Card>
                                        <Card.Header className={(this.state.choosedPayMethod === method.component ? 'card-header-selected' : '')}>
                                            <h5><strong>{method.name}</strong></h5>
                                        </Card.Header>
                                    </Card>
                                </Col>)
                        }
                    </Row>

                    <Row className="mt-5">
                        {this.state.choosedPayMethod ? this.state.choosedPayMethod : ''}
                    </Row>
                </Container>

            </Container>
        );
    }
}

export default PayMethods;