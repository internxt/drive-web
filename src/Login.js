import * as React from "react";
import { Button, Form } from "react-bootstrap";
import { Link } from 'react-router-dom';
import { isMobile } from "react-device-detect";

import "./Login.css";

class Login extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: '',
      password: '',
      isAuthenticated: false,
      token: ""
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    // If user have login cookies, continue to x-cloud
    if (localStorage.getItem("isAuthenticated") == true) {
      this.props.userHasAuthenticated(true);
      return;
    };
  }

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

    let loginValid = false;
    // Proceed with submit
    fetch("/api/login", {
      method: "post",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ email: this.state.email, password: this.state.password})
    }).then(response => {
        if (response.status == 200) {
          // Manage succesfull login
          const { token } = response;
          localStorage.setItem('xToken',token);
          this.setState({ isAuthenticated: true, token });
          loginValid = true;
        } else if(response.status == 204) {
          // Manage username / password do not match
          const { message } = response;
          alert(message);
        } else {
          // Manage user does not exist
          alert("This account doesn't exists");
        }
    })
      .catch(err => {
        console.error("Login error", err);
    });

    if(loginValid) {
      this.props.userHasAuthenticated(true);
      return;
    }
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
            <Form.Control type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
          </Form.Group>
          <Form.Group controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
          </Form.Group>
          <Button disabled={!this.validateForm()} type="submit" > Login </Button>
        </Form> 
      </div>
    );
  }
}

export default Login;
