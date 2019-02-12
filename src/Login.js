import * as React from "react";
import { Button, Form } from "react-bootstrap";
import { Link } from 'react-router-dom';
import { isMobile } from "react-device-detect";

import history from './history';
import "./Login.css";

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

  //componentDidMount() {
  // TO-DO If user have login token, continue to x-cloud
  //}

  validateForm() {
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

    // Proceed with submit
    fetch("/api/login", {
      method: "post",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ email: this.state.email, password: this.state.password})
    })
    .then(response => {
        if (response.status == 200) {
          // Manage succesfull login
          response.json().then(function (body) {
            localStorage.setItem('xToken',body.token);
            history.push('/app');
            this.setState({ 
              isAuthenticated: true, 
              token: body.token,
              user: { email: this.state.email } });
          });
        } else if(response.status == 204) {
          // Manage username / password do not match
          response.json().then(function (body) {
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
        <div className="LoginHeader">
            <h2> Login into X-Cloud</h2>
            <p>or <Link to="/register">Create a new account</Link> on X-Cloud</p>
      </div>
        <Form className="formBlock" onSubmit={this.handleSubmit}>
          <Form.Group controlId="email">
            <Form.Label >Email</Form.Label>
            <Form.Control autoFocus required type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
          </Form.Group>
          <Form.Group controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control required type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
          </Form.Group>
          <Button type="submit" > Login </Button>
        </Form> 
      </div>
    );
  }
}

export default Login;
