import * as React from 'react';
import { Button, Form, Col, Container, Spinner } from 'react-bootstrap';

import history from '../../lib/history';
import './Login.scss';
import { encryptText, decryptText, passToHash, decryptTextWithKey } from '../../lib/utils';

import { getHeaders } from '../../lib/auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import localStorageService from '../../services/localStorage.service';
import { analytics } from '../../lib/analytics';
import { decryptPGP } from '../../lib/utilspgp';
import AesUtil from '../../lib/AesUtil';
import { storeTeamsInfo } from '../../services/teams.service';
import { generateNewKeys } from '../../services/pgp.service';
import { validateFormat } from '../../services/keys.service';

interface LoginProps {
  email?: string
  password?: string
  handleKeySaved?: (user: any) => void
  isAuthenticated: boolean
}

class Login extends React.Component<LoginProps> {
  state = {
    email: '',
    password: '',
    isAuthenticated: false,
    token: '',
    user: {},
    showTwoFactor: false,
    twoFactorCode: '',
    isLogingIn: false,
    registerCompleted: true
  }

  componentDidMount() {
    // Check if recent login is passed and redirect user to Internxt Drive
    const mnemonic = localStorageService.get('xMnemonic');
    const user = localStorageService.getUser();
    // const xKeys = localStorage.getItem('xKeys');
    // const xKeyPublic = localStorage.getItem('xKeyPublic');

    if (user && user.registerCompleted && mnemonic && this.props.handleKeySaved) {
      this.props.handleKeySaved(user);
      history.push('/app');
    } else if (user && user.registerCompleted === false) {
      history.push('/appsumo/' + user.email);
    }
  }

  componentDidUpdate() {
    if (this.state.isAuthenticated && this.state.token && this.state.user) {
      const mnemonic = localStorageService.get('xMnemonic');

      if (!this.state.registerCompleted) {
        history.push('/appsumo/' + this.state.email);
      } else if (mnemonic) {
        history.push('/app');
      }
    }
  }

  validateLoginForm = () => {
    let isValid = true;
    // Email validation

    if (this.state.email.length < 5 || !this.validateEmail(this.state.email)) {
      isValid = false;
    }
    // Pass length check
    if (this.state.password.length < 1) {
      isValid = false;
    }

    return isValid;
  }

  validate2FA = () => {
    const pattern = /^\d{3}(\s+)?\d{3}$/;

    return pattern.test(this.state.twoFactorCode);
  }

  validateEmail = (email: string) => {
    // eslint-disable-next-line no-control-regex
    const emailPattern = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/;

    return emailPattern.test(email.toLowerCase());
  }

  handleChange = (event: any) => this.setState({ [event.target.id]: event.target.value });

  check2FANeeded = () => {
    fetch('/api/login', {
      method: 'POST',
      headers: getHeaders(true, true),
      body: JSON.stringify({ email: this.state.email })
    }).then(async res => {

      const data = await res.json();

      if (res.status !== 200) {
        window.analytics.track('user-signin-attempted', {
          status: 'error',
          msg: data.error ? data.error : 'Login error',
          email: this.state.email
        });
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
        this.setState({ isLogingIn: false });
        window.analytics.track('user-signin-attempted', {
          status: 'error',
          msg: err.message,
          email: this.state.email
        });
        toast.warn(`"${err}"`);
      }
    });
  }

  generateNewKeys = async (password: string) => {
    const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await generateNewKeys();

    return {
      privateKeyArmored,
      privateKeyArmoredEncrypted: AesUtil.encrypt(privateKeyArmored, password, false),
      publicKeyArmored,
      revocationCertificate
    };
  }

  doLogin = async () => {
    // Proceed with submit
    fetch('/api/login', {
      method: 'post',
      headers: getHeaders(false, false),
      body: JSON.stringify({ email: this.state.email })
    }).then(response => {
      if (response.status === 400) {
        return response.json().then((body) => {
          throw Error(body.error || 'Cannot connect to server');
        });
      } else if (response.status !== 200) {
        throw Error('This account doesn\'t exists');
      }

      return response.json();
    }).then(async (body) => {
      // Manage credentials verification
      const keys = await this.generateNewKeys(this.state.password);

      // Check password
      const salt = decryptText(body.sKey);
      const hashObj = passToHash({ password: this.state.password, salt });
      const encPass = encryptText(hashObj.hash);

      return fetch('/api/access', {
        method: 'post',
        headers: getHeaders(false, false),
        body: JSON.stringify({
          email: this.state.email,
          password: encPass,
          tfa: this.state.twoFactorCode,
          privateKey: keys.privateKeyArmoredEncrypted,
          publicKey: keys.publicKeyArmored,
          revocateKey: keys.revocationCertificate
        })
      }).then(async res => {
        return { res, data: await res.json() };
      }).then(res => {
        if (res.res.status !== 200) {
          window.analytics.track('user-signin-attempted', {
            status: 'error',
            msg: res.data.error ? res.data.error : 'Login error',
            email: this.state.email
          });
          throw new Error(res.data.error ? res.data.error : res.data);
        }
        return res.data;
      }).then(async data => {
        const privateKey = data.user.privateKey;
        const publicKey = data.user.publicKey;
        const revocateKey = data.user.revocateKey;

        const { update, privkeyDecrypted, newPrivKey } = await validateFormat(privateKey, this.state.password);

        analytics.identify(data.user.uuid, {
          email: this.state.email,
          platform: 'web',
          referrals_credit: data.user.credit,
          referrals_count: Math.floor(data.user.credit / 5),
          createdAt: data.user.createdAt
        });

        // Manage succesfull login
        const user = {
          ...data.user,
          mnemonic: decryptTextWithKey(data.user.mnemonic, this.state.password),
          email: this.state.email,
          privateKey: Buffer.from(privkeyDecrypted).toString('base64'),
          publicKey: publicKey,
          revocationKey: revocateKey
        };

        if (this.props.handleKeySaved) {
          this.props.handleKeySaved(user);
        }

        localStorageService.set('xToken', data.token);
        localStorageService.set('xMnemonic', user.mnemonic);
        localStorageService.set('xUser', JSON.stringify(user));

        if (update) {
          await this.updateKeys(publicKey, newPrivKey, revocateKey);
        }

        if (user.teams) {
          await storeTeamsInfo();
        }

        if (data.userTeam) {
          const mnemonicDecode = Buffer.from(data.userTeam.bridge_mnemonic, 'base64').toString();
          const mnemonicDecrypt = await decryptPGP(mnemonicDecode);

          const team = {
            idTeam: data.userTeam.idTeam,
            user: data.userTeam.bridge_user,
            password: data.userTeam.bridge_password,
            mnemonic: mnemonicDecrypt.data,
            admin: data.userTeam.admin,
            root_folder_id: data.userTeam.root_folder_id,
            isAdmin: data.userTeam.isAdmin
          };

          localStorageService.set('xTeam', JSON.stringify(team));
          localStorageService.set('xTokenTeam', data.tokenTeam);
        }

        window.analytics.identify(data.user.uuid, {
          email: this.state.email,
          platform: 'web',
          referrals_credit: data.user.credit,
          referrals_count: Math.floor(data.user.credit / 5),
          createdAt: data.user.createdAt
        }, () => {
          window.analytics.track('user-signin', {
            email: this.state.email,
            userId: user.uuid
          });
        });

        this.setState({
          isAuthenticated: true,
          token: data.token,
          user: user,
          registerCompleted: data.user.registerCompleted,
          isTeam: false
        });

      }).catch(err => {
        throw Error(`"${err.error ? err.error : err}"`);
      });
    }).catch(err => {
      console.error('Login error. ' + err.message);
      toast.warn(<>Login error<br />{err.message}</>);
    }).finally(() => {
      this.setState({ isLogingIn: false });
    });
  }

  updateKeys(newPublicKey, newPrivateKey, newRevocationKey) {
    const updatedKeys = {
      publicKey: newPublicKey,
      privateKey: newPrivateKey,
      revocationKey: newRevocationKey
    };

    return fetch('/api/user/keys', {
      method: 'PATCH',
      headers: getHeaders(true, false),
      body: JSON.stringify(updatedKeys)
    });
  }

  render() {
    if (!this.state.showTwoFactor) {
      const isValid = this.validateLoginForm();

      return (<div className="login-main">
        <Container className="login-container-box">
          <div className="container-register">
            <p className="container-title">Sign in to Internxt</p>
            <div className="menu-box">
              <button className="on">Sign in</button>
              <button className="off" onClick={(e: any) => {
                history.push('/new');
              }}>Create account</button>
            </div>
            <Form className="form-register" onSubmit={(e: any) => {
              e.preventDefault();
              this.setState({ isLogingIn: true }, () => this.check2FANeeded());
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
                  <Button className="on btn-block __btn-new-button" disabled={!isValid || this.state.isLogingIn} type="submit">{this.state.isLogingIn ? <Spinner animation="border" variant="light" style={{ fontSize: 1, width: '1rem', height: '1rem' }} /> : 'Sign in'}</Button>
                </Form.Group>
              </Form.Row>
            </Form>
          </div>
        </Container>

        <Container className="login-container-box-forgot-password">
          <p className="forgotPassword" onClick={(e: any) => {
            window.analytics.track('user-reset-password-request');
            history.push('/remove');
          }}>Forgot your password?</p>
        </Container>
      </div>
      );
    } else {
      const isValid = this.validate2FA();

      return (<div className="login-main">
        <Container className="login-container-box">
          <div className="container-register">
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
