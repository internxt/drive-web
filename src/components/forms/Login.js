import * as React from "react";
import { Button, Form, Col, Container } from "react-bootstrap";

import history from '../../history';
import "./Login.css";
import logo from '../../assets/logo.svg';
import { encryptText, decryptTextWithKey, decryptText, passToHash } from '../../utils';

import { isMobile, isAndroid, isIOS } from 'react-device-detect'


class Login extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
      isAuthenticated: false,
      token: "",
      user: {},
      showTwoFactor: false,
      twoFactorCode: ''
    };

    this.recaptchaRef = React.createRef();
  }

  componentDidMount() {
    if (isMobile) {
      if (isAndroid) {
        window.location.href = "https://play.google.com/store/apps/details?id=com.internxt.cloud";
      } else if (isIOS) {
        window.location.href = "https://itunes.apple.com/us/app/x-cloud-secure-file-storage/id1465869889";
      }
    }

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

  validate2FA = () => {
    let pattern = /^\d{3}(\s+)?\d{3}$/
    return pattern.test(this.state.twoFactorCode);
  }

  validateEmail = (email) => {
    let emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
    return emailPattern.test(String(email).toLowerCase());
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  check2FANeeded = () => {
    const headers = this.setHeaders();

    fetch('/api/login', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: this.state.email })
    }).then(async res => {

      const data = await res.json();

      if (res.status !== 200) {
        throw new Error(data.error ? data.error : 'Login error');
      }

      return data;

    }).then(res => {
      if (!res.tfa) {
        this.doLogin();
      } else {
        this.setState({ showTwoFactor: true });
      }
    }).catch(err => {
      if (err.message.includes('not activated') && this.validateEmail(this.state.email)) {
        history.push(`/activate/${this.state.email}`);
      } else {
        alert(err);
      }
    });
  }

  doLogin = () => {
    const headers = this.setHeaders();

    // Proceed with submit
    fetch("/api/login", {
      method: "post",
      headers,
      body: JSON.stringify({ email: this.state.email })
    })
      .then(response => {
        if (response.status === 200) {
          // Manage credentials verification
          response.json().then((body) => {
            // Check password
            const salt = decryptText(body.sKey);
            const hashObj = passToHash({ password: this.state.password, salt });
            const encPass = encryptText(hashObj.hash);

            fetch("/api/access", {
              method: "post",
              headers,
              body: JSON.stringify({
                email: this.state.email,
                password: encPass,
                tfa: this.state.twoFactorCode
              })
            }).then(async res => {
              return { res, data: await res.json() };
            }).then(res => {
              if (res.res.status !== 200) {
                throw new Error(res.data.error ? res.data.error : res.data);
              }
              var data = res.data;
              // Manage succesfull login
              const user = {
                userId: data.user.userId,
                email: this.state.email,
                mnemonic: data.user.mnemonic ? decryptTextWithKey(data.user.mnemonic, this.state.password) : null,
                root_folder_id: data.user.root_folder_id,
                storeMnemonic: data.user.storeMnemonic,
                name: data.user.name,
                lastname: data.user.lastname
              };
              this.props.handleKeySaved(user)
              localStorage.setItem('xToken', data.token);
              localStorage.setItem('xMnemonic', user.mnemonic);
              localStorage.setItem('xUser', JSON.stringify(user));
              this.setState({
                isAuthenticated: true,
                token: data.token,
                user: user
              });
            })
              .catch(err => {
                alert(err.error ? err.error : err);
              });
          });
        } else if (response.status === 400) {
          // Manage other cases:
          // username / password do not match, user activation required...
          response.json().then((body) => {
            alert(body.error);
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
  render() {
    if (!this.state.showTwoFactor) {
      const isValid = this.validateLoginForm();
      return (<div className="login-main">
        <Container className="login-container-box">
          <p className="logo logo-login"><img src={logo} alt="Logo" /></p>
          <div className="container-register">
            <p className="container-title">Sign in to X Cloud</p>
            <div className="menu-box">
              <button className="on">Sign in</button>
              <button className="off" onClick={(e) => {
                history.push('/new');
              }}>Create account</button>
            </div>
            <Form className="form-register" onSubmit={e => {
              e.preventDefault();
              this.check2FANeeded();
            }}>
              <Form.Row>
                <Form.Group as={Col} controlId="email">
                  <Form.Control xs={12} placeholder="Email address" required type="email" name="email" autoComplete="username" value={this.state.email} onChange={this.handleChange} />
                </Form.Group>
              </Form.Row>
              <Form.Row>
                <Form.Group as={Col} controlId="password">
                  <Form.Control xs={12} placeholder="Password" required type="password" name="password" autoComplete="current-password" value={this.state.password} onChange={this.handleChange} />
                </Form.Group>
              </Form.Row>
              <Form.Row className="form-register-submit">
                <Form.Group as={Col}>
                  <Button className="on btn-block" disabled={!isValid} xs={12} type="submit">Sign in</Button>
                </Form.Group>
              </Form.Row>
            </Form>
          </div>
        </Container>
      </div>
      );
    } else {
      const isValid = this.validate2FA();
      return (<div className="login-main">
        <Container className="login-container-box1">
          <p className="logo"><img src={logo} alt="Logo" /></p>
          <p className="container-title">Security Verification</p>
          <p className="privacy-disclaimer">Enter your 6 digit authenticator code below</p>
          <Form className="form-register container-register two-factor" onSubmit={e => {
            e.preventDefault();
            this.doLogin();
          }}>
            <Form.Row>
              <Form.Group as={Col} controlId="twoFactorCode">
                <Form.Control xs={12} placeholder="Authentication code" required type="text" name="two-factor" autoComplete="off" value={this.state.twoFactorCode} onChange={this.handleChange} maxLength={7} />
              </Form.Group>
            </Form.Row>
            <Form.Row className="form-register-submit">
              <Form.Group as={Col}>
                <Button className="on btn-block" disabled={!isValid} xs={12} type="submit">Sign in</Button>
              </Form.Group>
            </Form.Row>
          </Form>
        </Container>
      </div>);
    }
  }
}

export default Login;
