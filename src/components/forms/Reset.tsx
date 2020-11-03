import React from 'react';
import { Container } from 'react-bootstrap';
import './Login.scss';
import './Reset.scss';
import { Form, Col, Button } from 'react-bootstrap';
import NavigationBar from './../navigationBar/NavigationBar'
import { encryptText, passToHash, decryptText, encryptTextWithKey } from '../../lib/utils'
import history from '../../lib/history'
import { getHeaders } from '../../lib/auth'
import { analytics } from '../../lib/analytics'

interface ResetProps {
    match?: any
    isAuthenticated: Boolean
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

    handleChangePassword = (e: any) => {
        e.preventDefault();

        if (!this.state.salt) {
            return alert('Internal server error. Please reload.');
        }

        if (!this.validateForm()) {
            return alert('Passwords do not match.');
        }

        // Encrypt the password
        var hashedCurrentPassword = passToHash({ password: this.state.currentPassword, salt: this.state.salt }).hash;
        var encryptedCurrentPassword = encryptText(hashedCurrentPassword);

        // Encrypt the new password
        var hashedNewPassword = passToHash({ password: this.state.newPassword });
        var encryptedNewPassword = encryptText(hashedNewPassword.hash);
        var encryptedNewSalt = encryptText(hashedNewPassword.salt);

        // Encrypt the mnemonic
        var encryptedMnemonic = encryptTextWithKey(localStorage.xMnemonic, this.state.newPassword);

        fetch('/api/user/password', {
            method: 'PATCH',
            headers: getHeaders(true, true),
            body: JSON.stringify({
                currentPassword: encryptedCurrentPassword,
                newPassword: encryptedNewPassword,
                newSalt: encryptedNewSalt,
                mnemonic: encryptedMnemonic
            })
        })
            .then(async res => {
                var data = await res.json();
                return { res, data };
            })
            .then(res => {
                if (res.res.status !== 200) {
                    console.log(res);
                    throw res.data.error;
                } else {
                    analytics.track('user-change-password', {
                        status: 'success'
                    });
                    alert("Password changed successfully.");
                }
            })
            .catch(err => {
                analytics.track('user-change-password', {
                    status: 'error'
                });
                alert(err);
            });
    }

    componentDidMount() {
        if (!this.isLoggedIn()) {
            history.push('/login');
        }

        var localStg = JSON.parse(localStorage.xUser);

        fetch("/api/login", {
            method: "post",
            headers: getHeaders(false, false),
            body: JSON.stringify({ email: localStg.email })
        })
            .then(res => res.json())
            .then(res => {
                this.setState({ salt: decryptText(res.sKey) });
            }).catch(err => {
                alert('Error:\n' + (err.error ? err.error : 'Internal server error'));
            });
    }

    validateForm = () => {
        return this.state.newPassword === this.state.confirmNewPassword;
    }

    render() {
        return <div>
            <NavigationBar navbarItems={<h5>Settings</h5>} />
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
