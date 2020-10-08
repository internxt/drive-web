import * as React from "react";
import { Button, Form, Col, Container } from "react-bootstrap";

import history from '../../lib/history';
import "./Login.scss";
import logo from '../../assets/drive-logo.svg';
import { encryptText, decryptTextWithKey, decryptText, passToHash } from '../../lib/utils';

import { isMobile, isAndroid, isIOS } from 'react-device-detect'

import { getHeaders } from '../../lib/auth'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { analytics } from '../../lib/analytics';

interface LoginProps {
  email?: string
  password?: string
  handleKeySaved?: (user: any) => void
  isAuthenticated: Boolean
}

class Login extends React.Component<LoginProps> {
  state = {
    email: '',
    password: '',
    isAuthenticated: false,
    token: "",
    user: {},
    showTwoFactor: false,
    twoFactorCode: ''
  }

  componentDidMount() {
    if (isMobile) {
      if (isAndroid) {
        window.location.href = "https://play.google.com/store/apps/details?id=com.internxt.cloud";
      } else if (isIOS) {
        window.location.href = "https://itunes.apple.com/us/app/x-cloud-secure-file-storage/id1465869889";
      }
    }

    // Check if recent login is passed and redirect user to Internxt Drive
    const mnemonic = localStorage.getItem('xMnemonic');
    const user = JSON.parse(localStorage.getItem('xUser') || '{}');

    if (user && mnemonic && this.props.handleKeySaved) {
      this.props.handleKeySaved(user)
      history.push('/app')
    }
  }

  componentDidUpdate() {
    if (this.state.isAuthenticated && this.state.token && this.state.user) {
      const mnemonic = localStorage.getItem('xMnemonic');
      if (mnemonic) {
        history.push('/app')
      }
    }
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

  validateEmail = (email: string) => {
    // eslint-disable-next-line no-control-regex
    let emailPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/
    return emailPattern.test(email.toLowerCase());
  }

  handleChange = (event: any) => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  check2FANeeded = () => {
    fetch('/api/login', {
      method: 'POST',
      headers: getHeaders(true, true),
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
        toast.warn(`"${err}"`);
      }
    });
  }

  doLogin = () => {
    // Proceed with submit
    fetch("/api/login", {
      method: "post",
      headers: getHeaders(true, false),
      body: JSON.stringify({ email: this.state.email })
    }).then(response => {
      if (response.status === 200) {
        // Manage credentials verification
        response.json().then((body) => {
          // Check password
          const salt = decryptText(body.sKey);
          const hashObj = passToHash({ password: this.state.password, salt });
          const encPass = encryptText(hashObj.hash);

          fetch("/api/access", {
            method: "post",
            headers: getHeaders(true, false),
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
              lastname: data.user.lastname,
              uuid: data.user.uuid,
              credit: data.user.credit
            };
            if (this.props.handleKeySaved) {
              this.props.handleKeySaved(user)
            }
            localStorage.setItem('xToken', data.token);
            localStorage.setItem('xMnemonic', user.mnemonic);
            localStorage.setItem('xUser', JSON.stringify(user));
            this.setState({
              isAuthenticated: true,
              token: data.token,
              user: user
            });
            analytics.track({
              event: 'user-signup',
              userId: data.user.uuid
            })
          })
            .catch(err => {
              toast.warn(`"${err.error ? err.error : err}"`);
            });
        });
      } else if (response.status === 400) {
        // Manage other cases:
        // username / password do not match, user activation required...
        response.json().then((body) => {
          toast.warn(body.error);
        });
      } else {
        // Manage user does not exist
        toast.warn("This account doesn't exists");
      }
    })
      .catch(err => {
        console.error("Login error. " + err);
        toast.warn('Login error');
      });
  }

  render() {
    if (!this.state.showTwoFactor) {
      const isValid = this.validateLoginForm();
      return (<div className="login-main">
        <Container className="login-container-box">
          <div className="container-register">
            <p className="logo"><img src={logo} alt="Logo" /></p>
            <p className="container-title">Sign in to Internxt</p>
            <div className="menu-box">
              <button className="on">Sign in</button>
              <button className="off" onClick={(e: any) => {
                history.push('/new');
              }}>Create account</button>
            </div>
            <Form className="form-register" onSubmit={(e: any) => {
              e.preventDefault();
              this.check2FANeeded();
            }}>
              <Form.Row>
                <Form.Group as={Col} controlId="email">
                  <Form.Control placeholder="Email address" required type="email" name="email" autoComplete="username" value={this.state.email} onChange={this.handleChange} autoFocus />
                </Form.Group>
              </Form.Row>
              <Form.Row>
                <Form.Group as={Col} controlId="password">
                  <Form.Control placeholder="Password" required type="password" name="password" autoComplete="current-password" value={this.state.password} onChange={this.handleChange} />
                </Form.Group>
              </Form.Row>
              <Form.Row className="form-register-submit">
                <Form.Group as={Col}>
                  <Button className="on btn-block __btn-new-button" disabled={!isValid} type="submit">Sign in</Button>
                </Form.Group>
              </Form.Row>
            </Form>


          </div>
        </Container>

        <Container className="login-container-box-forgot-password">
          <p className="forgotPassword" onClick={(e: any) => {
            history.push('/remove');
          }}
          >Forgot your password?</p>
        </Container>
      </div>
      );
    } else {
      const isValid = this.validate2FA();
      return (<div className="login-main">
        <Container className="login-container-box">
          <div className="container-register">
            <p className="logo"><img src={logo} alt="Logo" /></p>
            <p className="container-title">Security Verification</p>
            <p className="privacy-disclaimer">Enter your 6 digit authenticator code below</p>
            <Form className="form-register container-register two-factor" onSubmit={(e: any) => {
              e.preventDefault();
              this.doLogin();
            }}>
              <Form.Row>
                <Form.Group as={Col} controlId="twoFactorCode">
                  <Form.Control placeholder="Authentication code" required type="text" name="two-factor" autoComplete="off" value={this.state.twoFactorCode} onChange={this.handleChange} />
                </Form.Group>
              </Form.Row>
              <Form.Row className="form-register-submit">
                <Form.Group as={Col}>
                  <Button className="on btn-block __btn-new-button" disabled={!isValid} type="submit">Sign in</Button>
                </Form.Group>
              </Form.Row>
            </Form>
          </div>
        </Container>
      </div>);
    }
  }
}

export default Login;
