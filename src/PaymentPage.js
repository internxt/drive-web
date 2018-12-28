import * as React from 'react';
import './PaymentPage.css';

class PaymentPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: {},
      token: null
    };
  }
  render() {
    return (
      <div className="container">
        <div>
          <h3>Settings</h3>
        </div>
        <div className="body-container">
          <div className="round-button--wrapper">
            <button className="round-button" />
          </div>
          <div className="payment-methods--container">
            <div className="payment-method-title">
              <h1>Choose a Payment method.</h1>
            </div>
            <div className="button-row">
              <button className="default-button payment-button">
                Credit Card
              </button>
              <button className="default-button payment-button">PayPal</button>
              <button className="default-button payment-button">INXT</button>
            </div>
            <div className="payment-form--container">
              <div className="payment-form-title">
                <h2>Enter your card details.</h2>
              </div>
              <form className="form-row">
                <input
                  type="text"
                  className="input-field"
                  name="name"
                  placeholder="Card holders name"
                />
                <input
                  type="text"
                  className="input-field"
                  name="number"
                  placeholder="Card number"
                />
                <input
                  type="text"
                  className="input-field"
                  name="expiration"
                  placeholder="Card expiration date"
                />
                <input
                  type="text"
                  className="input-field"
                  name="cvc"
                  placeholder="CVC Number"
                />
              </form>
              <div className="agree-terms-row">
                <label className="agree-terms-container">
                  <div>I agree to the X Cloud Terms</div>
                  <input type="checkbox" defaultChecked="checked" />
                  <span className="agree-terms" />
                </label>
                <div>You’ll be charged $2.50 monthly for 100GB</div>
              </div>
              <div className="buy-button-row">
                <button className="default-button full-width-button">Buy now</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default PaymentPage;
