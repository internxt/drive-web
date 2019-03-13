import * as React from "react";
import { Button, ButtonToolbar, Form, Modal, Col } from "react-bootstrap";
import ReCAPTCHA from "react-google-recaptcha";

import history from './history';
import "./Login.css";
import logo from './assets/logo.svg';
import closeTabIcon from './assets/Dashboard-Icons/Close\ tab.svg';
import { encryptText, encryptTextWithKey ,passToHash } from './utils';

const bip39 = require('bip39');

class Register extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      name: '',
      lastname: '',
      email: '',
      password: '',
      confirmPassword: '',
      showModal: false,
      token: "",
      validated: false,
      user: {}
    };

    this.recaptchaRef = React.createRef();
  }

  setHeaders = () => {
    let headers = {
      Authorization: `Bearer ${localStorage.getItem("xToken")}`,
      "content-type": "application/json; charset=utf-8"
    };
    if (!this.state.user.mnemonic) {
      headers = Object.assign(headers, {
        "internxt-mnemonic": localStorage.getItem("xMnemonic")
      });
    }
    return headers;
  }

  validateForm = () => {
    let isValid = true;

    // Name lenght check
    if (this.state.name.length < 1 && this.state.lastname.length < 1) isValid = false;
    // Email length check and validation
    if (this.state.email.length < 5 || !this.validateEmail(this.state.email)) isValid = false;
    // Pass length check
    if (this.state.password.length < 1 && this.state.confirmPassword.length < 1) isValid = false;
    // Pass and confirm pass validation
    if (this.state.password !== this.state.confirmPassword) isValid = false;

    return isValid;
  }

  validateEmail = (email) => {
    var re = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
    return re.test(String(email).toLowerCase());
  }

  goLogin = () => {
    history.push('/login');
  }

  captchaLaunch = event => {
    const form = event.currentTarget;
    event.preventDefault();

    // Form validation
    if (form.checkValidity() === false || this.validateForm() === false) {
      event.stopPropagation();
    }
    this.setState({ validated: true })

    // Captcha execution
    this.recaptchaRef.current.execute();
  }

  resolveCaptcha = captchaToken => {
    const headers = this.setHeaders();
    return new Promise((resolve, reject) => {
      fetch('/api/captcha/' + captchaToken, {
        method: 'GET',
        headers
      }).then(response => { resolve(response); })
      .catch(err => {
        console.error("Captcha validation error. ", err);
        reject(err);
      });
    });
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  handleHide = () => {
    this.setState({ showModal: false });
  };

  handleSubmit = captchaToken => {
    // Captcha resolution
    const captchaPromise = this.resolveCaptcha(captchaToken) 
    captchaPromise.then(response => response.json())
    .then((resolved) => {
      if (resolved.success) {
        const headers = this.setHeaders();

        // Setup hash and salt 
        const hashObj = passToHash({ password: this.state.password });
        const encPass = encryptText(hashObj.hash);
        const encSalt = encryptText(hashObj.salt);
        // Setup mnemonic
        const mnemonic = bip39.generateMnemonic(256);
        const encMnemonic = encryptTextWithKey(mnemonic, this.state.password);

        fetch("/api/register", {
          method: "post",
          headers,
          body: JSON.stringify({ 
            name: this.state.name,
            lastname: this.state.lastname,
            email: this.state.email, 
            password: encPass,
            mnemonic: encMnemonic,
            salt: encSalt
          })
        }).then(response => {
            if (response.status === 200) {
              response.json().then( (body) => {
                // Manage succesfull register
                const { token, user } = body;
                localStorage.setItem('xToken',token);
                
                // Clear form fields
                this.setState({ 
                  name: '',
                  lastname: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  validated: false,
                  showModal: true, 
                  token,
                  user 
                });
              });
            } else {
              response.json().then( (body) => {
                // Manage account already exists (error 400)
                const { message } = body;
                alert(message);
                this.setState({ validated: false });
              })
            }
          })
          .catch(err => {
            console.error("Register error", err);
          });
      }
    }).catch(error => {
      console.error('Captcha validation error: ' + error);
    });
  }

  clearFields = () => {
    this.setState({
      name: '',
      lastname: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  }

  render() {
    const { validated } = this.state;
    const isValid = this.validateForm();
    return (
      <div>
        <img src={logo} className="Logo" style={{height: 46 ,width: 46}}/>
        <div id="Login" className="Login">
          <div className="LoginHeader">
            <h2> Welcome to X Cloud </h2>
            <ButtonToolbar>
              <Button size="lg" className="button-off" onClick={this.goLogin}>Sign in</Button>
              <Button size="lg" className="button-on">Create account</Button>
            </ButtonToolbar>
            <h4>Enter your details below</h4>
          </div>
          <Modal dialogClassName="modal-custom" fade={false} show={this.state.showModal}>
          <Modal.Body>
            <img src={closeTabIcon} onClick={this.handleHide}/>
            <h1>You're nearly there...</h1>
            <p>
              Please check your email and follow the instructions from us to activate your account so you can start using X Cloud.
            </p>
          </Modal.Body>
        </Modal>
          <Form className="formBlock" noValidate validated={validated} onSubmit={this.captchaLaunch}>
            <Form.Row>
              <Form.Group as={Col} controlId="name">
                <Form.Control autoFocus required size="lg" placeholder="First Name" value={this.state.name} onChange={this.handleChange}/>
              </Form.Group>
              <Form.Group as={Col} controlId="lastname">
                <Form.Control required size="lg" placeholder="Last Name" value={this.state.lastname} onChange={this.handleChange}/>
              </Form.Group>
            </Form.Row>
            <Form.Group controlId="email">
              <Form.Control required size="lg" type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
            </Form.Group>
            <Form.Row>
              <Form.Group as={Col} controlId="password">
                <Form.Control required size="lg" type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
              </Form.Group>
              <Form.Group as={Col} controlId="confirmPassword">
                <Form.Control required size="lg" type="password" placeholder="Confirm your password" value={this.state.confirmPassword} onChange={this.handleChange} />
              </Form.Group>
            </Form.Row>
            <ReCAPTCHA sitekey="6Lf4_xsUAAAAAAEEhth1iM8LjyUn6gse-z0Y7iEp"
              ref={this.recaptchaRef}
              size="invisible"
              onChange={this.handleSubmit}
            />
            <p id="Terms">By creating an account, you are agreeing to our <a href="https://internxt.com/terms">Terms {"&"} Conditions</a> and <a href="https://internxt.com/privacy">Privacy Policy</a></p>
            <Button className="button-submit" disabled={!isValid} size="lg" type="submit" block> Continue </Button>
          </Form> 
        </div>
      </div>
    );
  }
}

export default Register;