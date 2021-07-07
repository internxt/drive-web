import * as React from 'react';
import { Container, Form, Col, Button } from 'react-bootstrap';
import Checkbox from '@material-ui/core/Checkbox';
import AesUtil from '../../lib/AesUtil';

import history from '../../lib/history';
import localStorageService from '../../services/localStorage.service';

import { decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from '../../lib/utils';
import { getHeaders } from '../../lib/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { analytics } from '../../lib/analytics';
import queryString, { ParsedQuery } from 'query-string';
import { initializeUser } from '../../services/auth.service';
import { generateNewKeys } from '../../services/pgp.service';

const bip39 = require('bip39');

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
    referrer: string | undefined
  }
  currentContainer: number
  showModal: Boolean
  token?: string
  user?: any
  isLoading: boolean
  checkTermsConditions: boolean
}

const CONTAINERS = {
  RegisterContainer: 1,
  PrivacyTermsContainer: 2,
  PasswordContainer: 3
};

class New extends React.Component<NewProps, NewState> {

  constructor(props: NewProps) {
    super(props);

    const qs = queryString.parse(history.location.search);

    const hasEmailParam = this.props.match.params.email && this.validateEmail(this.props.match.params.email);
    const hasTokenParam = qs.token;
    const hasReferrerParam = (qs.referrer && qs.referrer.toString()) || undefined;

    if (hasTokenParam && typeof hasTokenParam === 'string') {
      localStorageService.clear();
      localStorageService.set('xToken', hasTokenParam);
      history.replace(history.location.pathname);
    }

    this.state = {
      currentContainer: CONTAINERS.RegisterContainer,
      register: {
        name: '',
        lastname: '',
        email: hasEmailParam ? this.props.match.params.email : '',
        password: '',
        confirmPassword: '',
        referrer: hasReferrerParam
      },
      showModal: false,
      isLoading: false,
      checkTermsConditions: false
    };

  }

  componentDidMount() {

    const parsedQueryParams: ParsedQuery<string> = queryString.parse(history.location.search);
    const isEmailQuery = parsedQueryParams.email && this.validateEmail(parsedQueryParams.email.toString());

    if (isEmailQuery && parsedQueryParams.email !== this.state.register.email) {
      this.setState({
        register: { ...this.state.register, email: parsedQueryParams.email + '' }
      });
    }

    const xUser = localStorageService.getUser();
    const xToken = localStorageService.get('xToken');
    const mnemonic = localStorageService.get('xMnemonic');
    const haveInfo = (xUser && xToken && mnemonic);

    if (xUser.registerCompleted && (this.state.isAuthenticated === true || haveInfo)) {
      history.push('/app');
    }
  }

  handleChangeRegister = (event: any) => {
    var registerState = this.state.register;

    registerState[event.target.id] = event.target.value;
    this.setState({ register: registerState });
  }

  validateEmail = (email: string) => {
    // eslint-disable-next-line no-control-regex
    let emailPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/;

    return emailPattern.test(email.toLowerCase());
  }

  validateRegisterFormPart1 = () => {
    let isValid = true;

    if (!this.state.register.name || !this.state.register.lastname || !this.state.register.email) {
      return false;
    }

    // Name lenght check
    if (this.state.register.name.length < 1 && this.state.register.lastname.length < 1) {
      isValid = false;
    }
    // Email length check and validation
    if (this.state.register.email.length < 5 || !this.validateEmail(this.state.register.email)) {
      isValid = false;
    }

    return isValid;
  }

  validatePassword = () => {
    let isValid = true;

    if (!this.state.register.password || !this.state.register.confirmPassword) {
      return false;
    }

    // Pass length check
    if (this.state.register.password.length < 1 && this.state.register.confirmPassword.length < 1) {
      isValid = false;
    }
    // Pass and confirm pass validation
    if (this.state.register.password !== this.state.register.confirmPassword) {
      isValid = false;
    }

    return isValid;
  }

  readReferalCookie() {
    const cookie = document.cookie.match(/(^| )REFERRAL=([^;]+)/);

    return cookie ? cookie[2] : null;
  }

  doRegister = async () => {
    // Setup hash and salt
    const hashObj = passToHash({ password: this.state.register.password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    // Setup mnemonic
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, this.state.register.password);

    //Generate keys
    const { privateKeyArmored, publicKeyArmored: codpublicKey, revocationCertificate: codrevocationKey } = await generateNewKeys();

    //Datas
    const encPrivateKey = AesUtil.encrypt(privateKeyArmored, this.state.register.password, false);

    return fetch('/api/register', {
      method: 'post',
      headers: getHeaders(true, true),
      body: JSON.stringify({
        name: this.state.register.name,
        lastname: this.state.register.lastname,
        email: this.state.register.email,
        password: encPass,
        mnemonic: encMnemonic,
        salt: encSalt,
        referral: this.readReferalCookie(),
        privateKey: encPrivateKey,
        publicKey: codpublicKey,
        revocationKey: codrevocationKey,
        referrer: this.state.register.referrer
      })
    }).then(response => {
      if (response.status === 200) {
        return response.json().then((body) => {
          // Manage succesfull register
          const { token, user, uuid } = body;

          analytics.identify(uuid, { email: this.state.register.email, member_tier: 'free' });
          window.analytics.track('user-signup', {
            properties: {
              userId: uuid,
              email: this.state.register.email
            }
          });

          localStorageService.set('xToken', token);
          user.mnemonic = decryptTextWithKey(user.mnemonic, this.state.register.password);
          localStorageService.set('xUser', JSON.stringify(user));
          localStorageService.set('xMnemonic', user.mnemonic);

          return initializeUser(this.state.register.email, user.mnemonic).then((rootFolderInfo) => {
            user.root_folder_id = rootFolderInfo.user.root_folder_id;
            user.bucket = rootFolderInfo.user.bucket;
            localStorageService.set('xUser', JSON.stringify(user));
            history.push('/login');
          });
        });

      } else {
        return response.json().then((body) => {
          if (body.error) {
            throw new Error(body.error);
          } else {
            throw new Error('Internal Server Error');
          }
        });
      }
    }).catch(err => {
      console.error('Register error', err);
      toast.warn(`"${err.message}"`);
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
    };

    const fetchHandler = async (res: Response) => {
      const body = await res.text();

      try {
        const bodyJson = JSON.parse(body);

        return { res: res, body: bodyJson };
      } catch {
        return { res: res, body: body };
      }
    };

    return fetch('/api/appsumo/update', {
      method: 'POST',
      headers: getHeaders(true, false),
      body: JSON.stringify(body)
    }).then(fetchHandler).then(({ res, body }) => {
      if (res.status !== 200) {
        throw Error(body.error || 'Internal Server Error');
      } else {
        return body;
      }
    }).then(res => {
      const xToken = res.token;
      const xUser = res.user;

      xUser.mnemonic = mnemonic;

      return initializeUser(this.state.register.email, xUser.mnemonic).then((rootFolderInfo) => {
        xUser.root_folder_id = rootFolderInfo.user.root_folder_id;
        localStorageService.set('xToken', xToken);
        localStorageService.set('xMnemonic', mnemonic);
        localStorageService.set('xUser', JSON.stringify(xUser));
      });
    });

  }

  registerContainer() {
    return <div className="container-register">
      <p className="container-title">Create an Internxt account</p>
      <div className="menu-box">
        <button className="off" onClick={(e) => {
          history.push('/login');
        }}>Sign in</button>
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

  handleTermsConditions = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ checkTermsConditions: event.target.checked });
  };

  privacyContainer() {
    return (<div className="container-register">
      <p className="container-title">Internxt Security</p>
      <p className="privacy-disclaimer">
        Internxt uses your password to encrypt and decrypt your files. Due to the secure nature of Internxt, we don't know your password. That means that if you forget it, your files will be gone. With us, you're the only owner of your files.        </p>
      <ul className="privacy-remainders">
        <li>Store your Password. Keep it safe and secure.</li>
      </ul>

      <div className="privacy-terms">
        <Checkbox
          checked={this.state.checkTermsConditions}
          onChange={this.handleTermsConditions}
          color="default"
          inputProps={{ 'aria-label': 'secondary checkbox' }}
        />
        <a href="https://internxt.com/en/legal" target="_blank" rel="noreferrer">Accept terms, conditions and privacy policy</a>
      </div>

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
            <button className="btn-block on" type="submit" autoFocus disabled={!this.state.checkTermsConditions}>Continue</button>
          </Form.Group>
        </Form.Row>

      </Form>
    </div>);
  }

  passwordContainer() {
    return <div className="container-register">
      <p className="container-title">Create an Internxt account</p>
      <div className="menu-box">
        <button className="off" onClick={(e: any) => { /* this.setState({ currentContainer: this.loginContainer() }) */ }}>Sign in</button>
        <button className="on">Create account</button>
      </div>
      <Form className="form-register" onSubmit={async (e: any) => {
        e.preventDefault();

        await new Promise<void>(r => this.setState({ isLoading: true }, () => r()));

        if (!this.validatePassword()) {
          toast.warn(<div>Password mismatch</div>);
          this.setState({ isLoading: false });
          return;
        }

        if (!this.props.isNewUser) {
          this.updateInfo().then(() => {
            history.push('/login');
          }).catch(err => {
            toast.error(<div>
              <div>Reason: {err.message}</div>
              <div>Please contact us</div>
            </div>, {
              autoClose: false,
              closeOnClick: false
            });
          }).finally(() => {
            this.setState({ isLoading: false });
          });
        } else {
          this.doRegister().finally(() => this.setState({ isLoading: false }));
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
