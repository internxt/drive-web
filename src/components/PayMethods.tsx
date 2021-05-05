import React, { SyntheticEvent } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import './PayMethods.scss';

import PayPal from './paymentBridges/PayPal';
import INXT from './paymentBridges/INXT';

interface PayMethodsProps {
    choosedPlan: string
}

interface PayMethodsState {
    choosedPayMethod: JSX.Element | null,
    choosedPlan: string
}

const AvailablePayMethods = [
  {
    name: 'Credit Card',
    component: null
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

class PayMethods extends React.Component<PayMethodsProps, PayMethodsState> {
  constructor(props: PayMethodsProps) {
    super(props);

    this.state = {
      choosedPayMethod: null,
      choosedPlan: props.choosedPlan
    };

  }

  render() {
    return (
      <Container fluid>

        <Container className="mt-5" style={{ maxWidth: '784px' }}>
          <Row>
            <h2><strong>Choose a payment method.</strong></h2>
          </Row>

          <Row className="mt-5 payMethods">
            {
              AvailablePayMethods.map(method =>
                <Col xs={12} md={4} sm={6} onClick={(e: SyntheticEvent) => {
                  this.setState({ choosedPayMethod: method.component });
                }}>
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