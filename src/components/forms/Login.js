import * as React from "react";
import { Button, Form, Col, Container, Row, FormGroup, FormControl } from "react-bootstrap";

import history from '../../history';
import "./Login.css";
import logo from '../../assets/logo.svg';
import { encryptText, decryptTextWithKey } from '../../utils';

const bip39 = require('bip39');

const DEV = process.env.NODE_ENV == 'development';

class Login extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
      isAuthenticated: false,
      token: "",
      user: {}
    };

    this.recaptchaRef = React.createRef();
  }

  componentDidMount() {
    // Check if recent login is passed and redirect user to X Cloud
    const mnemonic = localStorage.getItem('xMnemonic');
    const user = JSON.parse(localStorage.getItem('xUser'));

    if (user && mnemonic) {
      this.props.handleKeySaved(user)
      history.push('/app')
    }
  }

  componentDidUpdate() {
    if (this.state.isAuthenticated === true && this.state.token && this.state.user) {
      const mnemonic = localStorage.getItem('xMnemonic');
      if (mnemonic) {
        history.push('/app')
      }
    }
  }

  setHeaders = () => {
    let headers = {
      Authorization: `Bearer ${localStorage.getItem("xToken")}`,
      "content-type": "application/json; charset=utf-8",
      "internxt-mnemonic": localStorage.getItem("xMnemonic")
    }
    return headers;
  }

  validateLoginForm = () => {
    let isValid = true;

    // Email validation
    if (this.state.email.length < 5 || !this.validateEmail(this.state.email)) isValid = false;
    // Pass length check
    if (this.state.password.length < 1) isValid = false;

    return isValid;
  }



  validateEmail = (email) => {
    var re = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    return re.test(String(email).toLowerCase());
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  doLogin = () => {
    const headers = this.setHeaders();

    // Proceed with submit
    fetch("/api/login", {
      method: "post",
      headers,
      body: JSON.stringify({ email: this.state.email, password: encryptText(this.state.password) })
    })
      .then(response => {
        if (response.status === 200) {
          // Manage succesfull login
          response.json().then((body) => {
            const user = {
              userId: body.user.userId,
              email: this.state.email,
              mnemonic: body.user.mnemonic ? decryptTextWithKey(body.user.mnemonic, this.state.password) : null,
              root_folder_id: body.user.root_folder_id,
              storeMnemonic: body.user.storeMnemonic
            };
            this.props.handleKeySaved(user)
            localStorage.setItem('xToken', body.token);
            localStorage.setItem('xMnemonic', user.mnemonic);
            localStorage.setItem('xUser', JSON.stringify(user));
            this.setState({
              isAuthenticated: true,
              token: body.token,
              user: user
            })
          });
        } else if (response.status === 400) {
          // Manage other cases:
          // username / password do not match, user activation required...
          response.json().then((body) => {
            alert(body.message);
          });
        } else {
          // Manage user does not exist
          alert("This account doesn't exists");
        }
      })
      .catch(err => {
        console.error("Login error. " + err);
        alert('Login error');
      });
  }

  formerLogin = () => {
    const isValid = this.validateForm();

    this.recaptchaRef = React.createRef();

    return (
      <div>
        <img src={logo} className="Logo" style={{ height: 27.5, width: 52.4 }} />
        <div id="Login" className="Login">
          <Form className="formBlock" onSubmit={this.handleSubmit}>
            <Form.Row>
              <Form.Group as={Col} controlId="email">
                <Form.Control autoFocus required size="lg" type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
              </Form.Group>
              <Form.Group as={Col} controlId="password">
                <Form.Control required size="lg" type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
              </Form.Group>
            </Form.Row>
            <p id="Terms">By signing in, you are agreeing to our <a href="https://internxt.com/terms">Terms {"&"} Conditions</a> and <a href="https://internxt.com/privacy">Privacy Policy</a></p>
            <Button className="button-submit" disabled={!isValid} size="lg" type="submit" block> Continue </Button>
          </Form>
        </div>
      </div>)
  };

  render() {
    const isValid = this.validateLoginForm();

    return (<div className="login-main">
      <Container className="login-container-box">
        <p className="logo"><img src={logo} /></p>
        <div className="container-register">
          <p className="container-title">Sign in to X Cloud</p>
          <div className="menu-box">
            <button className="on">Sign in</button>
            <button className="off" onClick={(e) => {
              history.push('/new');
            }}>Create account</button>
          </div>
          <Form className="form-register" onSubmit={this.handleSubmitDev}>
            <Form.Row>
              <Form.Group as={Col} controlId="email">
                <Form.Control xs={12} placeholder="Email address" required type="email" name="email" autoComplete="username" onChange={this.handleChange} />
              </Form.Group>
            </Form.Row>
            <Form.Row>
              <Form.Group as={Col} controlId="password">
                <Form.Control xs={12} placeholder="Password" required type="password" name="password" autoComplete="current-password" onChange={this.handleChange} />
              </Form.Group>
            </Form.Row>
            <Form.Row className="form-register-submit">
              <Form.Group as={Col}>
                <Button className="on btn-block" xs={12} onClick={e => {
                  if (!this.validateLoginForm()) {
                    alert('No valid');
                    return false;
                  }
                  if (DEV) {
                    this.doLogin();
                  } else {
                    this.doLogin();
                  }
                  e.preventDefault();
                }}>Sign in</Button>
              </Form.Group>
            </Form.Row>
          </Form>
        </div>
      </Container>
    </div>
    );
  }
}

export default Login;

