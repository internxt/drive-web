import * as React from "react";
import { Button, Form } from "react-bootstrap";
import { Link } from 'react-router-dom';
import { isMobile } from "react-device-detect";

import history from './history';
import "./Login.css";
import logo from './assets/logo.svg';

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
  }

  componentDidMount() {
    // Check if recent login is passed and redirect user to X Cloud
    const mnemonic = localStorage.getItem('xMnemonic');
    const user = JSON.parse(localStorage.getItem('xUser'));

    if (user) { 
      this.props.handleKeySaved(user)
      if (user.storeMnemonic == true && mnemonic) {
        // Case of login and mnemonic loaded from server
        history.push('/app')
      } else {
        // Case of login and mnemonic required by user
        history.push('/keyPage');
      }
    }
  }

  componentDidUpdate() {
    if (this.state.isAuthenticated == true && this.state.token && this.state.user) {
      const mnemonic = localStorage.getItem('xMnemonic');
      if (this.state.user.storeMnemonic == true && mnemonic) {
        // Case of login and mnemonic loaded from server
        history.push('/app')
      } else {
        // Case of login and mnemonic loaded from server
        history.push('/KeyPage')
      }
    }
  }

  setHeaders = () => {
    let headers = {
      Authorization: `Bearer ${localStorage.getItem("xToken")}`,
      "content-type": "application/json; charset=utf-8"
    };
    if (!this.state.user.mnemonic) {
      headers = Object.assign(headers, {
        "internxt-mnemonic": localStorage.getItem("xMnemonic")
      });
    }
    return headers;
  }

  validateForm = () => {
    let isValid = true;

    if (this.state.email.length < 5) isValid = false;
    if (this.state.password.length < 1) isValid = false;

    return isValid;
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  handleSubmit = event => {
    event.preventDefault();

    const headers = this.setHeaders();
    // Proceed with submit
    fetch("/api/login", {
      method: "post",
      headers,
      body: JSON.stringify({ email: this.state.email, password: this.state.password})
    })
    .then(response => {
        if (response.status == 200) {
          // Manage succesfull login
          response.json().then( (body) => {
            const user = { 
              email: this.state.email,  
              mnemonic: body.user.mnemonic,
              root_folder_id: body.user.root_folder_id,
              storeMnemonic: body.user.storeMnemonic 
            };
            this.props.handleKeySaved(user)
            localStorage.setItem('xToken',body.token);
            if (body.user.mnemonic && body.user.storeMnemonic == true) localStorage.setItem('xMnemonic', body.user.mnemonic);
            localStorage.setItem('xUser', JSON.stringify(user));
            this.setState({ 
              isAuthenticated: true, 
              token: body.token,
              user: user
            })
          });
        } else if(response.status == 400) {
          // Manage other cases:
          // username / password do not match, user activation required...
          response.json().then( (body) => {
            alert(body.message);
          });
        } else {
          // Manage user does not exist
          alert("This account doesn't exists");
        }
    })
      .catch(err => {
        console.error("Login error. ", err);
    });
  }

  render() {
    return (
      <div className="Login">
      <img src={logo} alt="logo" className="Logo" style={{height: 46 ,width: 46}}/>
      <div className="LoginHeader">
        <h2> Login into X Cloud</h2>
        <p className="LoginSubHeader">or <Link to="/register">Create a new account</Link></p>
      </div>
        <Form className="formBlock" onSubmit={this.handleSubmit}>
          <Form.Group controlId="email">
            <Form.Control autoFocus required size="lg" type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
          </Form.Group>
          <Form.Group controlId="password">
            <Form.Control required size="lg" type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
          </Form.Group>
          <Button size="lg" type="submit" > Login </Button>
        </Form> 
      </div>
    );
  }
}

export default Login;
