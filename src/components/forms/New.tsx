import * as React from "react";
import { Container, Form, Col, Button } from "react-bootstrap";

import logo from '../../assets/drive-logo.svg';
import history from '../../lib/history';

import { encryptText, encryptTextWithKey, passToHash } from '../../lib/utils';
import { isMobile, isAndroid, isIOS } from 'react-device-detect'
import { getHeaders } from '../../lib/auth'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { analytics } from "../../lib/analytics";
import queryString, { ParsedQuery } from 'query-string'
import Settings from "../../lib/settings";

const bip39 = require('bip39')

interface NewProps {
    match: any
    location: {
        search: string
    }
    isNewUser: boolean
}

interface NewState {
    isAuthenticated?: Boolean
    register: {
        name: string
        lastname: string
        email: string
        password: string
        confirmPassword: string
    }
    currentContainer: number
    validated?: Boolean
    showModal: Boolean
    token?: string
    user?: any
    isLoading: boolean
}

const CONTAINERS = {
    RegisterContainer: 1,
    PrivacyTermsContainer: 2,
    PasswordContainer: 3,
    ActivationContainer: 4
}

class New extends React.Component<NewProps, NewState> {

    constructor(props: NewProps) {
        super(props);

        const qs = queryString.parse(history.location.search);

        const hasEmailParam = this.props.match.params.email && this.validateEmail(this.props.match.params.email);
        const hasTokenParam = qs.token;

        if (hasTokenParam && typeof hasTokenParam === 'string') {
            Settings.clear();
            Settings.set('xToken', hasTokenParam)
            history.replace(history.location.pathname)
        }

        this.state = {
            currentContainer: hasEmailParam && this.props.isNewUser ? CONTAINERS.ActivationContainer : CONTAINERS.RegisterContainer,
            register: {
                name: '',
                lastname: '',
                email: hasEmailParam ? this.props.match.params.email : '',
                password: '',
                confirmPassword: ''
            },
            showModal: false,
            isLoading: false
        };

    }

    componentDidMount() {
        if (isMobile) {
            if (isAndroid) {
                window.location.href = "https://play.google.com/store/apps/details?id=com.internxt.cloud";
            } else if (isIOS) {
                window.location.href = "https://apps.apple.com/us/app/internxt-drive-secure-file-storage/id1465869889";
            }
        }

        const parsedQueryParams: ParsedQuery<string> = queryString.parse(history.location.search);
        const isEmailQuery = parsedQueryParams.email && this.validateEmail(parsedQueryParams.email.toString())

        if (isEmailQuery && parsedQueryParams.email !== this.state.register.email) {
            this.setState({
                register: { ...this.state.register, email: parsedQueryParams.email + '' }
            })
        }


        const xUser = Settings.getUser();
        const xToken = Settings.get('xToken');
        const mnemonic = Settings.get('xMnemonic');
        const haveInfo = (xUser && xToken && mnemonic);

        if (xUser.registerCompleted && (this.state.isAuthenticated === true || haveInfo)) {
            history.push('/app')
        }
    }

    handleChangeRegister = (event: any) => {
        var registerState = this.state.register;
        registerState[event.target.id] = event.target.value;
        this.setState({ register: registerState });
    }

    validateEmail = (email: string) => {
        // eslint-disable-next-line no-control-regex
        let emailPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/
        return emailPattern.test(email.toLowerCase());
    }

    validateRegisterFormPart1 = () => {
        let isValid = true;

        if (!this.state.register.name || !this.state.register.lastname || !this.state.register.email) {
            return false;
        }

        // Name lenght check
        if (this.state.register.name.length < 1 && this.state.register.lastname.length < 1) isValid = false;
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
        if (this.state.register.password !== this.state.register.confirmPassword) {
            isValid = false
        }

        return isValid;
    }

    readReferalCookie() {
        const cookie = document.cookie.match(/(^| )REFERRAL=([^;]+)/);
        return cookie ? cookie[2] : null;
    }


    doRegister = () => {
        // Setup hash and salt
        const hashObj = passToHash({ password: this.state.register.password });
        const encPass = encryptText(hashObj.hash);
        const encSalt = encryptText(hashObj.salt);
        // Setup mnemonic
        const mnemonic = bip39.generateMnemonic(256);
        const encMnemonic = encryptTextWithKey(mnemonic, this.state.register.password);

        return fetch("/api/register", {
            method: "post",
            headers: getHeaders(true, true),
            body: JSON.stringify({
                name: this.state.register.name,
                lastname: this.state.register.lastname,
                email: this.state.register.email,
                password: encPass,
                mnemonic: encMnemonic,
                salt: encSalt,
                referral: this.readReferalCookie()
            })
        }).then(response => {
            if (response.status === 200) {
                response.json().then((body) => {
                    // Manage succesfull register
                    const { token, user, uuid } = body;
                    Settings.set('xToken', token);

                    analytics.identify(uuid, { email: this.state.register.email, member_tier: 'free' });
                    window.analytics.track('user-signup', {
                        properties: {
                            userId: uuid,
                            email: this.state.register.email
                        }
                    })

                    // Clear form fields
                    this.setState({
                        register: {
                            name: '',
                            lastname: '',
                            email: this.state.register.email,
                            password: '',
                            confirmPassword: '',
                        },
                        validated: false,
                        showModal: true,
                        token,
                        user,
                        currentContainer: CONTAINERS.ActivationContainer
                    });

                    history.push('/login');
                });

            } else {
                response.json().then((body) => {
                    // Manage account already exists (error 400)
                    const { message } = body;
                    toast.warn(`"${message}"`);
                    this.setState({ validated: false });
                })
            }
        }).catch(err => {
            console.error("Register error", err);
        });

    }

    updateInfo = () => {
        // Setup hash and salt
        const hashObj = passToHash({ password: this.state.register.password });
        const encPass = encryptText(hashObj.hash);
        const encSalt = encryptText(hashObj.salt);

        // Setup mnemonic
        const mnemonic = bip39.generateMnemonic(256);
        const encMnemonic = encryptTextWithKey(mnemonic, this.state.register.password);

        // Body
        const body = {
            name: this.state.register.name,
            lastname: this.state.register.lastname,
            email: this.state.register.email,
            password: encPass,
            mnemonic: encMnemonic,
            salt: encSalt,
            referral: this.readReferalCookie()
        }

        const fetchHandler = async (res: Response) => {
            const body = await res.text();
            try {
                const bodyJson = JSON.parse(body);
                return { res: res, body: bodyJson }
            } catch {
                return { res: res, body: body }
            }
        }

        return fetch('/api/appsumo/update', {
            method: 'POST',
            headers: getHeaders(true, false),
            body: JSON.stringify(body)
        }).then(fetchHandler).then(({ res, body }) => {
            if (res.status !== 200) {
                throw Error(body.error || 'Internal Server Error')
            } else {
                return body;
            }
        }).then(res => {
            Settings.clear();
            history.push('/login');
        });

    }

    resendEmail = async (email: string) => {
        if (!this.validateEmail(email)) {
            throw Error('No email address provided');
        }
        
        return fetch(`/api/user/resend/${email}`, {
            method: 'GET'
        }).then(async res => {
            return { response: res, data: await res.json() };
        }).then(res => {
            if (res.response.status !== 200) {
                throw res.data;
            } else {
                toast.info(`Activation email sent to ${email}`);
            }
        }).catch(err => {
            toast.warn(`Error: ${err.error ? err.error : 'Internal Server Error'}`);
        });
    }

    registerContainer() {
        return <div className="container-register">
            <p className="logo"><img src={logo} alt="Logo" /></p>
            <p className="container-title">Create an Internxt account</p>
            <div className="menu-box">
                <button className="off" onClick={(e) => { history.push('/login') }}>Sign in</button>
                <button className="on">Create account</button>
            </div>
            <Form className="form-register" onSubmit={(e: any) => {
                e.preventDefault();

                if (this.validateRegisterFormPart1()) {
                    var tempReg = this.state.register;
                    tempReg.email = tempReg.email.toLowerCase().trim();
                    this.setState({
                        currentContainer: CONTAINERS.PrivacyTermsContainer,
                        register: tempReg
                    });
                }
            }}>
                <Form.Row>
                    <Form.Group as={Col} controlId="name">
                        <Form.Control placeholder="First name" required autoComplete="name"
                            onChange={this.handleChangeRegister}
                            value={this.state && this.state.register.name} autoFocus />
                    </Form.Group>
                    <Form.Group as={Col} controlId="lastname">
                        <Form.Control placeholder="Last name" required autoComplete="lastname"
                            onChange={this.handleChangeRegister}
                            value={this.state && this.state.register.lastname} />
                    </Form.Group>
                </Form.Row>
                <Form.Row>
                    <Form.Group as={Col} controlId="email">
                        <Form.Control placeholder="Email address" type="email" required autoComplete="email"
                            onChange={this.handleChangeRegister}
                            disabled={!this.props.isNewUser}
                            value={this.state && this.state.register.email} />
                    </Form.Group>
                </Form.Row>
                <Form.Row className="form-register-submit">
                    <Form.Group as={Col}>
                        <button className="on btn-block" type="submit" disabled={!this.validateRegisterFormPart1()}>Continue</button>
                    </Form.Group>
                </Form.Row>
            </Form>
        </div>;
    }

    privacyContainer() {
        return (<div className="container-register">
            <p className="logo"><img src={logo} alt="Logo" /></p>
            <p className="container-title">Internxt Security</p>
            <p className="privacy-disclaimer">Internxt Drive uses your password to encrypt and decrypt your files. Due to the secure nature of Internxt Drive, we don't know your password. That means that if you ever forget it, your files are gone forever. With us, you're the only owner of your files. We strongly suggest you to:</p>
            <ul className="privacy-remainders">
                <li>Store your Password. Keep it safe and secure.</li>
                <li>Keep an offline backup of your password.</li>
            </ul>
            <Form onSubmit={(e: any) => {
                e.preventDefault();
                this.setState({ currentContainer: CONTAINERS.PasswordContainer });
            }}>
                <Form.Row>
                    <Form.Group as={Col} controlId="name">
                        <button className="btn-block off" onClick={(e: any) => {
                            this.setState({ currentContainer: CONTAINERS.RegisterContainer });
                            e.preventDefault();
                        }}>Back</button>
                    </Form.Group>
                    <Form.Group as={Col}>
                        <button className="btn-block on" type="submit" autoFocus>Continue</button>
                    </Form.Group>
                </Form.Row>

            </Form>
        </div>);
    }

    passwordContainer() {
        return <div className="container-register">
            <p className="logo"><img src={logo} alt="Logo" /></p>
            <p className="container-title">Create an Internxt account</p>
            <div className="menu-box">
                <button className="off" onClick={(e: any) => { /* this.setState({ currentContainer: this.loginContainer() }) */ }}>Sign in</button>
                <button className="on">Create account</button>
            </div>
            <Form className="form-register" onSubmit={async (e: any) => {
                e.preventDefault();

                await new Promise<void>(r => this.setState({ isLoading: true }, () => r()));

                if (!this.validatePassword()) {
                    return toast.warn(<div>Password mismatch</div>);
                }

                if (!this.props.isNewUser) {
                    this.updateInfo().catch(err => {
                        toast.error(<div>
                            <div>Reason: {err.message}</div>
                            <div>Please contact us</div>
                        </div>, {
                            autoClose: false,
                            closeOnClick: false
                        });
                    }).finally(() => {
                        this.setState({ isLoading: false })
                    });
                }
                else {
                    this.doRegister();
                }
            }}>
                <Form.Row>
                    <Form.Control type="hidden" name="username" autoComplete="username" value={this.state.register.email} />
                    <Form.Group as={Col} controlId="password">
                        <Form.Control type="password" required placeholder="Password" autoComplete="new-password" onChange={this.handleChangeRegister} autoFocus />
                    </Form.Group>
                </Form.Row>
                <Form.Row>
                    <Form.Group as={Col} controlId="confirmPassword">
                        <Form.Control type="password" required placeholder="Confirm password" autoComplete="confirm-password" onChange={this.handleChangeRegister} />
                    </Form.Group>
                </Form.Row>
                <Form.Row className="form-register-submit">
                    <Form.Group as={Col}>
                        <Button className="btn-block off" onClick={(e: any) => {
                            this.setState({ currentContainer: CONTAINERS.PrivacyTermsContainer });
                            e.preventDefault();
                        }}>Back</Button>
                    </Form.Group>
                    <Form.Group as={Col}>
                        <Button className="btn-block on __btn-new-button" type="submit" disabled={this.state.isLoading}>Continue</Button>
                    </Form.Group>
                </Form.Row>
            </Form>
        </div >;
    }

    activationContainer() {
        return (<div className="container-register">
            <p className="logo"><img src={logo} alt="Logo" /></p>
            <p className="container-title">Activation Email</p>
            <p className="privacy-disclaimer">Please check your email <b>{this.state.register.email}</b> and follow the instructions to activate your account so you can start using Internxt Drive.</p>
            <ul className="privacy-remainders" style={{ paddingTop: '20px' }}>By creating an account, you are agreeing to our Terms &amp; Conditions and Privacy Policy</ul>
            <button className="btn-block on" onClick={() => {
                this.resendEmail(this.state.register.email).catch(err => {
                    toast.error(<div><div>Error sending email</div><div>Reason: {err.message}</div></div>);
                });
            }}>Re-send activation email</button>
        </div>);
    }

    render() {
        return (<div className="login-main">
            <Container className="login-container-box">
                {this.state.currentContainer === CONTAINERS.RegisterContainer ? this.registerContainer() : ''}
                {this.state.currentContainer === CONTAINERS.PrivacyTermsContainer ? this.privacyContainer() : ''}
                {this.state.currentContainer === CONTAINERS.PasswordContainer ? this.passwordContainer() : ''}
            </Container>
            <Container className="login-container-box-forgot-password">
                <p className="forgotPassword"></p>
            </Container>
        </div>
        );
    }
}

export default New;
