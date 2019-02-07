import * as React from "react";
import { Button, FormGroup, FormControl, FormLabel } from "react-bootstrap";
import { Link } from 'react-router-dom';
import { isMobile } from "react-device-detect";

import "./Login.css";

class Register extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      name: '',
      lastname: '',
      email: '',
      password: '',
      confirmPassword: '',
      isAuthenticated: false,
      isLogin: false,
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

    if (this.state.name.length < 1 && this.state.lastname.length < 1) isValid = false;
    if (this.state.email.length < 5) isValid = false;
    if (this.state.password.length < 1 && this.state.confirmPassword.length < 1) isValid = false;
    if (this.state.password != this.state.confirmPassword) isValid = false;

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
    fetch("/api/register", {
      method: "post",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ 
        name: this.state.name,
        lastname: this.state.lastname,
        email: this.state.email, 
        password: this.state.password
      })
    }).then(response => {
        if (response.status == 200) {
          // Manage succesfull register
          const { token } = response;
          localStorage.setItem('xToken',token);
          this.setState({ isAuthenticated: true, token });
          loginValid = true;
        } else {
          // Manage account already exists
          const { message } = response;
          alert(message);
        }
      })
      .catch(err => {
        console.error("Login error", err);
      });
    }

    if(loginValid) {
      this.props.userHasAuthenticated(true);
      return;
    }

  render() {
    return (
      <div className="LoginBlock">
          <div className="LoginHeader">
            <h2> Create your X-Cloud account </h2>
            <p>or <Link to="/login">Sign in with your existent account</Link></p>
          </div>
      <form onSubmit={this.handleSubmit}>
        <FormGroup controlId="name" bsSize="large">
          <FormLabel>First Name</FormLabel>
          <FormControl
            autoFocus
            value={this.state.name}
            onChange={this.handleChange}/>
        </FormGroup>
        <FormGroup controlId="lastname" bsSize="large">
          <FormLabel>Last Name</FormLabel>
          <FormControl
            value={this.state.lastname}
            onChange={this.handleChange}/>
        </FormGroup>
        <FormGroup controlId="email" bsSize="large">
          <FormLabel>Email</FormLabel>
          <FormControl
            type="email"
            value={this.state.email}
            onChange={this.handleChange}
          />
        </FormGroup>
        <FormGroup controlId="password" bsSize="large">
          <FormLabel>Password</FormLabel>
          <FormControl
            type="password"
            value={this.state.password}
            onChange={this.handleChange}
          />
        </FormGroup>
        <FormGroup controlId="confirmPassword" bsSize="large">
          <FormLabel>Confirm your password</FormLabel>
          <FormControl
            type="password"
            value={this.state.confirmPassword}
            onChange={this.handleChange}
          />
        </FormGroup>
        <Button
          block
          bsSize="large"
          disabled={!this.validateForm()}
          type="submit"
        >
          Register
        </Button>
      </form> 
    </div>
    );
  }
}

export default Register;
