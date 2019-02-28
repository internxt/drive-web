import * as React from "react";
import { Button, Form, Alert } from "react-bootstrap";
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
    return (
      <div className="Login">
        <img src={logo} alt="logo" className="Logo" style={{height: 46 ,width: 46}}/>
        <div className="LoginHeader">
          <h2> Create your X Cloud account </h2>
          <p className="LoginSubHeader">or <Link to="/login">Sign in with your account</Link></p>
        </div>
        <Alert className="formAlert" variant="success" show={this.state.isAuthenticated}>
          <Alert.Heading>Account registered succesfully!</Alert.Heading>
          <p> Now you need to go to your mail and follow instructions on activation email for start using X Cloud. </p>
        </Alert>
        <Form className="formBlock" noValidate validated={validated} onSubmit={this.handleSubmit}>
          <Form.Group controlId="name">
            <Form.Control autoFocus required size="lg" placeholder="First Name" value={this.state.name} onChange={this.handleChange}/>
          </Form.Group>
          <Form.Group controlId="lastname">
            <Form.Control required size="lg" placeholder="Last Name" value={this.state.lastname} onChange={this.handleChange}/>
          </Form.Group>
          <Form.Group controlId="email">
            <Form.Control required size="lg" type="email" placeholder="Email" value={this.state.email} onChange={this.handleChange} />
          </Form.Group>
          <Form.Group controlId="password">
            <Form.Control required size="lg" type="password" placeholder="Password" value={this.state.password} onChange={this.handleChange} />
          </Form.Group>
          <Form.Group controlId="confirmPassword">
            <Form.Control required size="lg" type="password" placeholder="Confirm your password" value={this.state.confirmPassword} onChange={this.handleChange} />
          </Form.Group>
          <Form.Group controlId="terms">
            <Form.Check id="terms">
              <Form.Check.Input required className="checkbox"/>
              <Form.Check.Label className="text-dark">  Agree <a href="https://internxt.com/terms">Terms {"&"} Conditions</a> and <a href="https://internxt.com/privacy">Privacy Policy</a></Form.Check.Label>
              <Form.Control.Feedback type="invalid">You must agree before submitting.</Form.Control.Feedback>
            </Form.Check>
          </Form.Group>
          <Button size="lg" type="submit"> Register </Button>
        </Form> 
      </div>
    );
  }
}

export default Register;