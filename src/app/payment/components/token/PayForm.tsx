import React from 'react';
import { Button, Col, Container, Form, Row } from 'react-bootstrap';

import { match } from 'react-router-dom';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import Finish from './finish/Finish';

import httpService from '../../../core/services/http.service';
import './PayForm.scss';

interface PayTokenProps {
  match: match<{ token: string }>;
  isAuthenticated: boolean;
}

interface PayTokenState {
  token: string;
  planSelector: string;
  paySelector: string;
  email: string;
  finish: boolean;
  error: boolean;
  inxtEUR: number;
  inxt: string;
  wallet: string;
}

const plans = ['200GB - €3.49/month', '2TB - €8.99/month'];
const planB = ['prepay 6 months - €3.99/month', 'prepay 12 months - €3.49/month'];
const totalPlanB = [3.99 * 6, 3.49 * 12];
const planC = ['prepay 6 months - €9.49/month', 'prepay 12 months - €8.99/month'];
const totalPlanC = [9.49 * 6, 8.99 * 12];

class PayToken extends React.Component<PayTokenProps, PayTokenState> {
  constructor(props: PayTokenProps) {
    super(props);

    this.state = {
      token: this.props.match.params.token,
      planSelector: '0',
      paySelector: '0',
      email: '',
      finish: false,
      error: false,
      inxtEUR: 1,
      inxt: '',
      wallet: '',
    };
  }

  isLoggedIn = (): boolean => {
    return !!localStorage.xToken;
  };

  componentDidMount(): void {
    if (!this.isLoggedIn()) {
      navigationService.push(AppView.Login);
    }

    /* TODO
    const user = localStorageService.getUser();
    getTokenInfo()
      .then((res) => {
        const tokenInfo = res;
        const tokenPrice = tokenInfo.INXT.quote.EUR.price;

        this.setState({ inxtEUR: tokenPrice.toFixed(2), email: user?.email || '' });
      })
      .catch(() => {
        this.setState({
          finish: true,
          error: true,
        });
      }); */
  }

  handleChange: React.ChangeEventHandler<{ value: unknown; id: string }> = (event) => {
    const statePropKey = event.target.id;
    const changes = { [statePropKey]: event.target.value } as Pick<PayTokenState, keyof PayTokenState>;

    this.setState(changes);
  };

  parseSubmit = (e): Promise<void> => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const object = {};

    formData.forEach(function (value, key) {
      object[key] = value;
    });

    object['plan'] = plans[this.state.planSelector];

    switch (this.state.planSelector) {
      case '0':
        object['pay'] = planB[this.state.planSelector];
        break;
      case '1':
        object['pay'] = planC[this.state.planSelector];
        break;
    }

    object['inxt'] = this.renderTotalINXT();

    const json = JSON.stringify(object);

    const serviceHeaders = httpService.getHeaders(true, false);
    const headers = httpService.convertHeadersToNativeHeaders(serviceHeaders);

    return fetch(`${process.env.REACT_APP_API_URL}/token/buy`, {
      method: 'post',
      headers: headers,
      body: json,
    })
      .then((res) => {
        if (res.status !== 200) {
          throw res;
        }
        this.setState({ finish: true, error: false });
      })
      .catch(() => {
        this.setState({ finish: true, error: true });
      });
  };

  renderSwitch = (): JSX.Element[] => {
    let result: JSX.Element[] = [];

    switch (this.state.planSelector) {
      case '0':
        result = planB.map((item, index) => <option value={index}>{item}</option>);
        break;
      case '1':
        result = planC.map((item, index) => <option value={index}>{item}</option>);
        break;
    }

    return result;
  };

  calculateTotalEUR = (): number => {
    let totalEUR = 0;

    switch (this.state.planSelector) {
      case '0':
        totalEUR = totalPlanB[this.state.paySelector];
        break;
      case '1':
        totalEUR = totalPlanC[this.state.paySelector];
        break;
    }

    return totalEUR;
  };

  calculateDiscount = (): number => {
    return this.calculateTotalEUR() * 0.1;
  };

  renderTotalINXT = () => {
    let totalEUR = this.calculateTotalEUR();

    totalEUR -= totalEUR * 0.1;

    const totalINXT = (totalEUR / this.state.inxtEUR).toFixed(2);

    return totalINXT;
  };

  render(): JSX.Element {
    return (
      <div>
        <Container className="form-main">
          {this.state.finish ? (
            <Finish error={this.state.error} />
          ) : (
            <Container className="form-container-box pay-crypto-box">
              <div className="container-form">
                <p className="container-title">Pay with Internxt Tokens and get 10% discount</p>
                <div className="referred-description py-3">
                  We currently accept Internxt tokens for crypto payments with a minimum order size of €10.
                  <br />
                  Complete the crypto payment request form below and we'll email you with a crypto invoice.
                </div>

                <div className="referred-description py-3">Market price of Internxt Tokens: {this.state.inxtEUR} €</div>
                <Form className="form-payment" onSubmit={this.parseSubmit}>
                  <Row>
                    <Form.Group as={Col} controlId="paymentType">
                      <Form.Label>Payment Type</Form.Label>
                      <Form.Control as="select" name="currency">
                        <option>INXT</option>
                      </Form.Control>
                    </Form.Group>
                    <Form.Group as={Col} controlId="planSelector">
                      <Form.Label>What plan would you like to pay for</Form.Label>
                      <Form.Control as="select" onChange={this.handleChange} name="planSelector">
                        {plans.map((item, index) => (
                          <option value={index}>{item}</option>
                        ))}
                      </Form.Control>
                    </Form.Group>
                  </Row>

                  <Row>
                    <Form.Group as={Col} controlId="email">
                      <Form.Label>Email Address for account to apply payment to</Form.Label>
                      <Form.Control
                        required
                        type="email"
                        name="email"
                        value={this.state.email}
                        onChange={this.handleChange}
                      />
                    </Form.Group>
                    <Form.Group as={Col} controlId="paySelector">
                      <Form.Label>How many months would you like to pay for?</Form.Label>
                      <Form.Control as="select" onChange={this.handleChange} name="paySelector">
                        {this.renderSwitch()}
                      </Form.Control>
                    </Form.Group>
                  </Row>
                  <Row>
                    <Form.Group as={Col} controlId="wallet">
                      <Form.Label>Wallet from which you are sending INXT tokens</Form.Label>
                      <Form.Control name="wallet" value={this.state.wallet} onChange={this.handleChange} required />
                    </Form.Group>
                  </Row>
                  <Row>
                    <Form.Group as={Col} controlId="message">
                      <Form.Label>Optionally include a message with your request</Form.Label>
                      <Form.Control as="textarea" name="message" />
                    </Form.Group>
                  </Row>

                  <Container style={{ textAlign: 'right' }}>
                    <Row>
                      <Col sm={10}> EUR to pay:</Col>
                      <Col> {this.calculateTotalEUR()} €</Col>
                    </Row>
                    <Row>
                      <Col sm={10}> 10% Discount: </Col>
                      <Col> {(this.calculateTotalEUR() * 0.1).toFixed(2)} €</Col>
                    </Row>
                    <Row>
                      <Col sm={10}> Total </Col>
                      <Col> {(this.calculateTotalEUR() - this.calculateTotalEUR() * 0.1).toFixed(2)} €</Col>
                    </Row>
                    <Row style={{ fontSize: '25px', fontWeight: 600 }}>
                      <Col sm={10}> INXT to pay:</Col>
                      <Col> {this.renderTotalINXT()}</Col>
                    </Row>
                  </Container>

                  <Row className="form-payment-submit">
                    <Form.Group as={Col}>
                      <Button className="on btn-block" type="submit">
                        Send Request
                      </Button>
                    </Form.Group>
                  </Row>
                </Form>
              </div>
            </Container>
          )}
        </Container>
      </div>
    );
  }
}

export default PayToken;
