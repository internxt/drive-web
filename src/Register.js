import * as React from "react";
import { Button, ButtonToolbar, Form, Alert, Col } from "react-bootstrap";
import { Link } from 'react-router-dom';

import "./Login.css";
import logo from './assets/logo.svg';

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
      token: "",
      validated: false,
      user: {}
    };
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

    // Name lenght check
    if (this.state.name.length < 1 && this.state.lastname.length < 1) isValid = false;
    // Email length check and validation
    if (this.state.email.length < 5 || !this.validateEmail(this.state.email)) isValid = false;
    // Pass length check
    if (this.state.password.length < 1 && this.state.confirmPassword.length < 1) isValid = false;
    // Pass and confirm pass validation
    if (this.state.password != this.state.confirmPassword) isValid = false;

    return isValid;
  }

  validateEmail = (email) => {
    var re = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
    return re.test(String(email).toLowerCase());
}

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  }

  handleSubmit = event => {
    const form = event.currentTarget;
    
    // Form validation
    if (form.checkValidity() === false || this.validateForm() == false) {
      event.stopPropagation();
    }
    event.preventDefault();
    this.setState({ validated: true })

    const headers = this.setHeaders();

    fetch("/api/register", {
      method: "post",
      headers,
      body: JSON.stringify({ 
        name: this.state.name,
        lastname: this.state.lastname,
        email: this.state.email, 
        password: this.state.password
      })
    }).then(response => {
        if (response.status == 200) {
          response.json().then( (body) => {
            // Manage succesfull register
            const { token, user } = body;
            localStorage.setItem('xToken',token);
            
            // Clear form fields
            this.setState({ 
              name: '',
              lastname: '',
              email: '',
              password: '',
              confirmPassword: '',
              validated: true,
              isAuthenticated: true, 
              token,
              user 
            });
          });
        } else {
          response.json().then( (body) => {
            // Manage account already exists (error 400)
            const { message } = body;
            alert(message);
          })
        }
      })
      .catch(err => {
        console.error("Register error", err);
      });
  }

  clearFields = () => {
    this.setState({
      name: '',
      lastname: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
  }

  render() {
    const { validated } = this.state;
    const isValid = this.validateForm();
    return (
      <div>
        <img src={logo} alt="logo" className="Logo" style={{height: 46 ,width: 46}}/>
        <div id="Login" className="Login">
          <div className="LoginHeader">
            <h2> Welcome to X Cloud </h2>
            <ButtonToolbar>
              <Button size="lg" id="button-on" tag={Link} to="/login">Sign in</Button>
              <Button size="lg" id="button-off">Create account</Button>
            </ButtonToolbar>
            <h4>Enter your details below</h4>
          </div>
          <Alert className="formAlert" variant="success" show={this.state.isAuthenticated}>
            <Alert.Heading>Account registered succesfully!</Alert.Heading>
            <p> Now you need to go to your mail and follow instructions on activation email for start using X Cloud. </p>
          </Alert>
          <Form className="formBlock" noValidate validated={validated} onSubmit={this.handleSubmit}>
            <Form.Row>
              <Form.Group as={Col} controlId="name">
                <Form.Control autoFocus required size="lg" placeholder="First Name" value={this.state.name} onChange={this.handleChange}/>
              </Form.Group>
              <Form.Group as={Col} controlId="lastname">
                <Form.Control required size="lg" placeholder="Last Name" value={this.state.lastname} onChange={this.handleChange}/>
              </Form.Group>
            </Form.Row>
            <Form.Group controlId="email">
              <Form.Control required size="lg" type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
            </Form.Group>
            <Form.Row>
              <Form.Group as={Col} controlId="password">
                <Form.Control required size="lg" type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
              </Form.Group>
              <Form.Group as={Col} controlId="confirmPassword">
                <Form.Control required size="lg" type="password" placeholder="Confirm your password" value={this.state.confirmPassword} onChange={this.handleChange} />
              </Form.Group>
            </Form.Row>
            <p id="Terms">By creating an account, you are agreeing to our <a href="https://internxt.com/terms">Terms {"&"} Conditions</a> and <a href="https://internxt.com/privacy">Privacy Policy</a></p>
            <Button className="button-submit" disabled={!isValid} size="lg" type="submit" block> Continue </Button>
          </Form> 
        </div>
      </div>
    );
  }
}

export default Register;