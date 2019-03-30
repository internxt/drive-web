import * as React from "react";

import { Container, Form, Col } from "react-bootstrap";

import logo from '../../assets/logo.svg';
import history from '../../history';

import { encryptText, encryptTextWithKey, passToHash } from '../../utils';

const bip39 = require('bip39');

const DEV = process.env.NODE_ENV == 'development';


class New extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            currentContainer: this.registerContainer(),
            register: {
                name: '',
                lastname: '',
                email: '',
                password: '',
                confirmPassword: ''
            }
        };
    }

    setHeaders = () => {
        let headers = {
            Authorization: `Bearer ${localStorage.getItem("xToken")}`,
            "content-type": "application/json; charset=utf-8",
            "internxt-mnemonic": localStorage.getItem("xMnemonic")
        }
        return headers;
    }

    componentDidMount() {
        const xUser = JSON.parse(localStorage.getItem('xUser'));
        const xToken = localStorage.getItem('xToken');
        const mnemonic = localStorage.getItem('xMnemonic');
        const haveInfo = (xUser && xToken && mnemonic);
        if (this.state.isAuthenticated === true || haveInfo) {
            history.push('/app')
        }
    }

    handleChangeRegister = event => {
        var registerState = this.state.register;
        registerState[event.target.id] = event.target.value;
        this.setState({ register: registerState });
    }

    validateEmail = (email) => {
        var re = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
        return re.test(String(email).toLowerCase());
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
                console.log('Register error');
            });

    }

    registerContainer() {
        return <div className="container-register">
            <p className="container-title">Create an X Cloud account</p>
            <div className="menu-box">
                <button className="off" onClick={(e) => { history.push('/login') }}>Sign in</button>
                <button className="on">Create account</button>
            </div>
            <Form className="form-register" onSubmit={e => {
                e.preventDefault();

                if (this.validateRegisterFormPart1()) {
                    var tempReg = this.state.register;
                    tempReg.email = tempReg.email.toLowerCase().trim();
                    this.setState({
                        currentContainer: this.privacyContainer(),
                        register: tempReg
                    });
                }
            }}>
                <Form.Row>
                    <Form.Group as={Col} controlId="name">
                        <Form.Control xs={6} placeholder="First name" required autoComplete="name" onChange={this.handleChangeRegister} />
                    </Form.Group>
                    <Form.Group as={Col} controlId="lastname">
                        <Form.Control xs={6} placeholder="Last name" required autoComplete="lastname" onChange={this.handleChangeRegister} />
                    </Form.Group>
                </Form.Row>
                <Form.Row>
                    <Form.Group as={Col} controlId="email">
                        <Form.Control xs={12} placeholder="Email address" type="email" required autoComplete="email" onChange={this.handleChangeRegister} />
                    </Form.Group>
                </Form.Row>
                <Form.Row className="form-register-submit">
                    <Form.Group as={Col}>
                        <button className="on btn-block" xs={12} type="submit">Continue</button>
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
            <Form className="form-register" onSubmit={e => {
                e.preventDefault();

                if (this.validatePassword()) {
                    this.doRegister();
                }
            }}>
                <Form.Row>
                    <Form.Group as={Col} controlId="password">
                        <Form.Control type="hidden" name="username" autoComplete="username" value={this.state.register.email} />
                        <Form.Control xs={12} type="password" required placeholder="Password" autoComplete="new-password" onChange={this.handleChangeRegister} />
                    </Form.Group>
                </Form.Row>
                <Form.Row>
                    <Form.Group as={Col} controlId="confirmPassword">
                        <Form.Control xs={12} type="password" required placeholder="Confirm password" autoComplete="confirm-password" onChange={this.handleChangeRegister} />
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
                        <button className="btn-block on" type="submit">Continue</button>
                    </Form.Group>
                </Form.Row>
            </Form>
        </div >;
    }

    activationContainer() {
        return (<div className="container-register">
            <p className="container-title">Activation Email</p>
            <p className="privacy-disclaimer">Please check your email and follow the instructions to activate your account so you can start using X Cloud.</p>
            <ul className="privacy-remainders" style={{ paddingTop: '20px' }}>
                By creating an account, you are agreeing to our Terms &amp; Conditions and Privacy Policy
          </ul>
            <button className="btn-block on">Re-send activation email</button>
        </div>);
    }

    render() {
        return (<div className="login-main">
            <Container className="login-container-box">
                <p className="logo"><img src={logo} /></p>
                {this.state.currentContainer}
            </Container>
        </div>
        );
    }
}

export default New;