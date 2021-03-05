import React from 'react';
import { Container } from 'react-bootstrap';
import './PayForm.scss';
import { Form, Col, Button } from 'react-bootstrap';
import NavigationBar from '../navigationBar/NavigationBar';
import history from '../../lib/history';
import Finish from './finish/Finish';

interface ResetProps {
    match?: any
    isAuthenticated: Boolean
}

const planA = ['pay per month - €0.99/month', 'prepay 6 months - €0.95/month', 'prepay 12 months - €0.89/month'];
const planB = ['pay per month - €4.49/month', 'prepay 6 months - €3.99/month', 'prepay 12 months - €3.49/month'];
const planC = ['pay per month - €9.99/month', 'prepay 6 months - €9.49/month', 'prepay 12 months - €8.99/month'];

class PayToken extends React.Component<ResetProps> {
    state = {
      token: this.props.match.params.token,
      isValidToken: true,
      planSelector: 'A',
      email: '',
      finish: false,
      error: false
    }

    IsValidToken = (token: string) => {
      return /^[a-z0-9]{512}$/.test(token) && this.state.isValidToken;
    }

    handleChange = (event: any) => {
      this.setState({ [event.target.id]: event.target.value });
    }

    isLoggedIn = () => {
      return !(!localStorage.xToken);
    }

    componentDidMount() {
      if (!this.isLoggedIn()) {
        history.push('/login');
      }
    }

    parseSubmit = (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      var object = {};

      formData.forEach(function (value, key) {
        object[key] = value;
      });

      console.log(object);

      var json = JSON.stringify(object);

      fetch('/api/token/buy', { method: 'post', body: json }).then(ok => {
        this.setState({ finish: true, error: false });
      }).catch(err => {
        this.setState({ finish: true, error: true });
      });
    }

    renderSwitch = () => {

      switch (this.state.planSelector) {
        case 'A':
          return planA.map((item, index) => <option value={index}>{item}</option>);
        case 'B':
          return planB.map((item, index) => <option value={index}>{item}</option>);
        case 'C':
          return planC.map((item, index) => <option value={index}>{item}</option>);
      }

    };

    render() {
      return <div>
        <NavigationBar navbarItems={<h5>Token</h5>} isTeam={false} isMember={false} isAdmin={false} />
        <Container className="form-main">
          {this.state.finish ?
            <Finish error={this.state.error}/>
            :
            (<Container className="form-container-box pay-crypto-box">
              <div className="container-form">
                <p className="container-title">Pay with Internxt Tokens and get 10% discount</p>
                <div
                  className="referred-description py-3"
                >
                  We currently accept Internxt tokens for crypto payments with a minimum order size of 10€.
                </div>
                <div
                  className="referred-description py-3"
                >
                  Complete the crypto payment request form below and we'll email you with a crypto invoice.
                </div>
                <Form className="form-payment" onSubmit={this.parseSubmit} >
                  <Form.Row>
                    <Form.Group as={Col} controlId="paymentType">
                      <Form.Label>Payment Type</Form.Label>
                      <Form.Control
                        as="select"
                        name="currency"
                      >
                        <option>INXT</option>
                      </Form.Control>
                    </Form.Group>
                  </Form.Row>
                  <Form.Row>
                    <Form.Group as={Col} controlId="planSelector">
                      <Form.Label>What plan would you like to pay for</Form.Label>
                      <Form.Control
                        as="select"
                        onChange={this.handleChange}
                        name="planSelector"
                      >
                        <option value="A">20GB - €0.89/month</option>
                        <option value="B">200GB - €3.49/month</option>
                        <option value="C">2TB - €8.99/month</option>
                      </Form.Control>
                    </Form.Group>
                  </Form.Row>
                  <Form.Row>
                    <Form.Group as={Col} controlId="paymentLengthSelector">
                      <Form.Label>How many months would you like to pay for? (minimum €10)</Form.Label>
                      <Form.Control
                        as="select"
                        name="paymentLengthSelector"
                      >
                        {this.renderSwitch()}
                      </Form.Control>
                    </Form.Group>
                  </Form.Row>
                  <Form.Row>
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
                  </Form.Row>
                  <Form.Row>
                    <Form.Group as={Col} controlId="message">
                      <Form.Label>Optionally include a message with your request</Form.Label>
                      <Form.Control
                        as="textarea"
                        name="message"
                      />
                    </Form.Group>
                  </Form.Row>
                  <Form.Row className="form-payment-submit">
                    <Form.Group as={Col}>
                      <Button
                        className="on btn-block"
                        type="submit"
                      >
                        Send Request
                      </Button>
                    </Form.Group>
                  </Form.Row>
                </Form>
              </div>
            </Container>)
          }
        </Container>
      </div>;
    }
}

export default PayToken;
