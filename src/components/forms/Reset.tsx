import React from 'react';
import localStorageService from '../../services/localStorage.service';
import { Container } from 'react-bootstrap';
import './Login.scss';
import './Reset.scss';
import { Form, Col, Button } from 'react-bootstrap';
import NavigationBar from './../navigationBar/NavigationBar';
import { encryptText, passToHash, decryptText, encryptTextWithKey } from '../../lib/utils';
import history from '../../lib/history';
import { getHeaders } from '../../lib/auth';
import { getUserData } from '../../lib/analytics';
import AesFunctions from '../../lib/AesUtil';

interface ResetProps {
  match?: any
  isAuthenticated: boolean
}

class Reset extends React.Component<ResetProps> {
  state = {
    token: this.props.match.params.token,
    isValidToken: true,
    salt: null,

    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  }

  IsValidToken = (token: string) => {
    return /^[a-z0-9]{512}$/.test(token) && this.state.isValidToken;
  }

  handleChange = (event: any) => {
    this.setState({ [event.target.id]: event.target.value });
  }

  isLoggedIn = () => {
    return !(!localStorage.xToken);
  }

  handleChangePassword = async (e: any) => {
    e.preventDefault();

    await this.getSalt();

    if (!this.state.salt) {
      return alert('Internal server error. Please reload.');
    }

    if (!this.validateForm()) {
      return alert('Passwords do not match.');
    }

    // Encrypt the password
    const hashedCurrentPassword = passToHash({ password: this.state.currentPassword, salt: this.state.salt }).hash;
    const encryptedCurrentPassword = encryptText(hashedCurrentPassword);

    // Encrypt the new password
    const hashedNewPassword = passToHash({ password: this.state.newPassword });
    const encryptedNewPassword = encryptText(hashedNewPassword.hash);
    const encryptedNewSalt = encryptText(hashedNewPassword.salt);

    // Encrypt the mnemonic
    const encryptedMnemonic = encryptTextWithKey(localStorage.xMnemonic, this.state.newPassword);
    const privateKey = Buffer.from(localStorageService.getUser().privateKey, 'base64').toString();
    const privateKeyEncrypted = AesFunctions.encrypt(privateKey, this.state.newPassword);

    fetch('/api/user/password', {
      method: 'PATCH',
      headers: getHeaders(true, true),
      body: JSON.stringify({
        currentPassword: encryptedCurrentPassword,
        newPassword: encryptedNewPassword,
        newSalt: encryptedNewSalt,
        mnemonic: encryptedMnemonic,
        privateKey: privateKeyEncrypted
      })
    })
      .then(async res => {
        const data = await res.json();

        return { res, data };
      })
      .then(res => {
        if (res.res.status !== 200) {
          throw res.data.error;
        } else {
          window.analytics.track('user-change-password', {
            status: 'success',
            email: getUserData().email
          });
          alert('Password changed successfully.');
        }
      })
      .catch(err => {
        window.analytics.track('user-change-password', {
          status: 'error',
          email: getUserData().email
        });
        alert(err);
      });
  }

  getSalt = () => {
    const email = localStorageService.getUser().email;

    return fetch('/api/login', {
      method: 'post',
      headers: getHeaders(false, false),
      body: JSON.stringify({ email })
    })
      .then(res => res.json())
      .then(res => new Promise<void>(resolve => {
        this.setState({ salt: decryptText(res.sKey) }, () => {
          resolve();
        });
      }));
  }

  componentDidMount() {
    if (!this.isLoggedIn()) {
      history.push('/login');
    }
  }

  validateForm = () => {
    return this.state.newPassword === this.state.confirmNewPassword;
  }

  render() {
    return <div>
      <NavigationBar navbarItems={<h5>Settings</h5>} isTeam={false} isMember={false} isAdmin={false} />
      <Container className="login-main">
        <Container className="login-container-box edit-password-box">
          <div className="container-register">
            <p className="container-title edit-password">Change your password</p>
            <Form className="form-register" onSubmit={this.handleChangePassword} >
              <Form.Row>
                <Form.Group as={Col} controlId="currentPassword">
                  <Form.Control placeholder="Current password" required type="password" name="current-password" value={this.state.currentPassword} onChange={this.handleChange} />
                </Form.Group>
              </Form.Row>
              <Form.Row>
                <Form.Group as={Col} controlId="newPassword">
                  <Form.Control placeholder="New password" required type="password" name="new-password" value={this.state.newPassword} onChange={this.handleChange} />
                </Form.Group>
              </Form.Row>
              <Form.Row>
                <Form.Group as={Col} controlId="confirmNewPassword">
                  <Form.Control placeholder="Confirm new password" required type="password" name="confirm-new-password" value={this.state.confirmNewPassword} onChange={this.handleChange} />
                </Form.Group>
              </Form.Row>
              <Form.Row className="form-register-submit">
                <Form.Group as={Col}>
                  <Button className="on btn-block" type="submit" >Change password</Button>
                </Form.Group>
              </Form.Row>
            </Form>
          </div>
        </Container>
      </Container>
    </div>;
  }
}

export default Reset;
