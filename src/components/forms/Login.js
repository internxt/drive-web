import * as React from "react";
import { Button, Form, Col, Container, Row, FormGroup, FormControl } from "react-bootstrap";
import ReCAPTCHA from "react-google-recaptcha";

import history from '../../history';
import "./Login.css";
import logo from '../../assets/logo.svg';
import { encryptText, encryptTextWithKey, passToHash, decryptTextWithKey } from '../../utils';

const bip39 = require('bip39');

class Login extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
      isAuthenticated: false,
      token: "",
      user: {},
      currentContainer: this.registerContainer(),
      register: {
        name: '',
        lastname: '',
        email: '',
        password: '',
        confirmPassword: ''
      }
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

  validateRegisterFormPart1 = () => {
    let isValid = true;

    if (!this.state.register.name || !this.state.register.lastname || !this.state.register.email) {
      return false;
    }

    // Name lenght check
    if (this.state.register.name.length < 1 && this.state.reguster.lastname.length < 1) isValid = false;
    // Email length check and validation
    if (this.state.register.email.length < 5 || !this.validateEmail(this.state.register.email)) isValid = false;

    return isValid;

  }

  validatePassword = () => {
    let isValid = true;

    if (!this.state.register.password || !this.state.register.confirmPassword) {
      return false;
    }

    // Pass length check
    if (this.state.register.password.length < 1 && this.state.register.confirmPassword.length < 1) isValid = false;
    // Pass and confirm pass validation
    if (this.state.register.password !== this.state.register.confirmPassword) isValid = false;

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

  handleChangeRegister = event => {
    var registerState = this.state.register;
    registerState[event.target.id] = event.target.value;
    this.setState({ register: registerState });
  }

  captchaLaunch = () => {
    this.recaptchaRef.current.execute();
  }

  resolveCaptcha = captchaToken => {
    const headers = this.setHeaders();
    return new Promise((resolve, reject) => {
      fetch('/api/captcha/' + captchaToken, {
        method: 'GET',
        headers
      }).then(response => { resolve(response); })
        .catch(err => { reject(err); });
    });
  }

  handleSubmitLogin = captchaToken => {
    // Captcha resolution
    const captchaPromise = this.resolveCaptcha(captchaToken)
    captchaPromise.then(response => response.json())
      .then((resolved) => {
        if (resolved.success) {

          this.doLogin();

        }
      }).catch((error) => {
        console.error('Captcha validation error: ' + error);
      })
    // After login
    this.recaptchaRef.current.reset();
  }

  handleSubmitRegister = captchaToken => {
    // Captcha resolution
    const captchaPromise = this.resolveCaptcha(captchaToken)
    captchaPromise.then(response => response.json())
      .then((resolved) => {
        if (resolved.success) {

          this.doRegister();

        }
      }).catch((error) => {
        console.error('Captcha validation error: ' + error);
      })
    // After login
    this.recaptchaRef.current.reset();
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
      });
  }

  doRegister = () => {
    const headers = this.setHeaders();

    // Setup hash and salt 
    const hashObj = passToHash({ password: this.state.register.password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    // Setup mnemonic
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, this.state.register.password);

    fetch("/api/register", {
      method: "post",
      headers,
      body: JSON.stringify({
        name: this.state.register.name,
        lastname: this.state.register.lastname,
        email: this.state.register.email,
        password: encPass,
        mnemonic: encMnemonic,
        salt: encSalt
      })
    }).then(response => {
      if (response.status === 200) {
        response.json().then((body) => {
          // Manage succesfull register
          const { token, user } = body;
          localStorage.setItem('xToken', token);

          // Clear form fields
          this.setState({
            register: {
              name: '',
              lastname: '',
              email: '',
              password: '',
              confirmPassword: '',
            },
            validated: false,
            showModal: true,
            token,
            user,
            currentContainer: this.activationContainer()
          });
        });
      } else {
        response.json().then((body) => {
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

  formerLogin = () => {
    const isValid = this.validateForm();

    this.recaptchaRef = React.createRef();

    return (
      <div>
        <img src={logo} className="Logo" style={{ height: 27.5, width: 52.4 }} />
        <div id="Login" className="Login">
          <Form className="formBlock" onSubmit={this.captchaLaunch}>
            <Form.Row>
              <Form.Group as={Col} controlId="email">
                <Form.Control autoFocus required size="lg" type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
              </Form.Group>
              <Form.Group as={Col} controlId="password">
                <Form.Control required size="lg" type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
              </Form.Group>
            </Form.Row>
            <ReCAPTCHA sitekey="6Lf4_xsUAAAAAAEEhth1iM8LjyUn6gse-z0Y7iEp"
              ref={this.recaptchaRef}
              size="invisible"
              onChange={this.handleSubmit}
            />
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
        {this.state.currentContainer}
      </Container>
    </div>
    );
  }

  registerContainer() {
    return <div className="container-register">
      <p className="container-title">Create an X Cloud account</p>
      <div className="menu-box">
      <button className="off" onClick={(e) => { this.setState({ currentContainer: this.loginContainer() }) }}>Sign in</button>
      <button className="on">Create account</button>
      </div>
      <Form className="form-register">
        <Form.Row>
          <Form.Group as={Col} controlId="name">
            <Form.Control xs={6} placeholder="First name" autoComplete="nope" onChange={this.handleChangeRegister} />
          </Form.Group>
          <Form.Group as={Col} controlId="lastname">
            <Form.Control xs={6} placeholder="Last name" autoComplete="nope" onChange={this.handleChangeRegister} />
          </Form.Group>
        </Form.Row>
        <Form.Row>
          <Form.Group as={Col} controlId="email">
            <Form.Control xs={12} placeholder="Email address" autoComplete="nope" onChange={this.handleChangeRegister} />
          </Form.Group>
        </Form.Row>
        <Form.Row className="form-register-submit">
          <Form.Group as={Col}>
            <button className="on btn-block" xs={12} onClick={e => {
              e.preventDefault();

              if (this.validateRegisterFormPart1()) {
                this.setState({
                  currentContainer: this.privacyContainer()
                });
              }

            }}>Continue</button>
          </Form.Group>
        </Form.Row>
      </Form>
    </div>;
  }

  privacyContainer() {
    return (<div className="container-register">
      <p className="container-title">X Cloud Security</p>
      <p className="privacy-disclaimer">Due to the secure nature of X Cloud we can't recover your information as we don't ever store user data. This means we can't access your account or reset your password. Once it's gone, it's gone forever. After you've set up a password on the next page we strongly suggest you:</p>
      <ul className="privacy-remainders">
        <li>Store your Password. Keep it safe and secure.</li>
        <li>Keep an offline backup of your password.</li>
      </ul>
      <Form>
        <Form.Row>
          <Form.Group as={Col} controlId="name">
            <button className="btn-block off" onClick={e => {
              this.setState({ currentContainer: this.registerContainer() });
              e.preventDefault();
            }}>Back</button>
          </Form.Group>
          <Form.Group as={Col}>
            <button className="btn-block on" onClick={e => {
              e.preventDefault();
              this.setState({ currentContainer: this.passwordContainer() });
            }}>Continue</button>
          </Form.Group>
        </Form.Row>

      </Form>
    </div>);
  }

  passwordContainer() {
    this.recaptchaRef = React.createRef();

    return <div className="container-register">
      <p className="container-title">Create an X Cloud account</p>
      <div className="menu-box">
      <button className="off" onClick={(e) => { this.setState({ currentContainer: this.loginContainer() }) }}>Sign in</button>
      <button className="on">Create account</button>
      </div>
      <Form className="form-register">
        <Form.Row>
          <Form.Group as={Col} controlId="password">
            <Form.Control xs={12} type="password" placeholder="Password" onChange={this.handleChangeRegister} />
          </Form.Group>
        </Form.Row>
        <Form.Row>
          <Form.Group as={Col} controlId="confirmPassword">
            <Form.Control xs={12} type="password" placeholder="Confirm password" onChange={this.handleChangeRegister} />
          </Form.Group>
        </Form.Row>
        <Form.Row className="form-register-submit">
          <Form.Group as={Col}>
            <button className="btn-block off" onClick={e => {
              this.setState({ currentContainer: this.privacyContainer() });
              e.preventDefault();
            }}>Back</button>
          </Form.Group>
          <Form.Group as={Col}>
            <button className="btn-block on" onClick={e => {
              if (this.validatePassword()) {
                var dev = false;
                if (dev) {
                  this.doRegister();
                } else {
                  this.captchaLaunch();
                }
              }
              e.preventDefault();

            }}>Continue</button>
          </Form.Group>
        </Form.Row>

        <ReCAPTCHA sitekey="6Lf4_xsUAAAAAAEEhth1iM8LjyUn6gse-z0Y7iEp"
          ref={this.recaptchaRef}
          size="invisible"
          onChange={this.handleSubmitRegister}
        />

      </Form>
    </div>;
  }

  loginContainer() {
    return <div className="container-register">
      <p className="container-title">Sign in to X Cloud</p>
      <div className="menu-box">
      <button className="on">Sign in</button>
      <button className="off" onClick={(e) => { this.setState({ currentContainer: this.registerContainer() }) }}>Create account</button>
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
              var dev = false;
              if (dev) {
                this.doLogin();
              } else {
                this.captchaLaunch();
              }
              e.preventDefault();
            }}>Sign in</Button>
          </Form.Group>
        </Form.Row>
        <ReCAPTCHA sitekey="6Lf4_xsUAAAAAAEEhth1iM8LjyUn6gse-z0Y7iEp"
          ref={this.recaptchaRef}
          size="invisible"
          onChange={this.handleSubmitLogin}
        />

      </Form>
    </div>;
  }

  activationContainer() {
    return (<div className="container-register">
      <p className="container-title">Activation Email</p>
      <p className="privacy-disclaimer">Please check your email and follow the instructions to activate your account so you can start using X Cloud.</p>
      <ul className="privacy-remainders" style={{paddingTop: '20px'}}>
        By creating an account, you are agreeing to our Terms &amp; Conditions and Privacy Policy
      </ul>
      <button className="btn-block on">Re-send activation email</button>
    </div>);
  }
}

export default Login;

