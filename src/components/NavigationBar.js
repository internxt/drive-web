import React from 'react';
import { Nav, Navbar } from 'react-bootstrap';

// Assets
import account from '../assets/Dashboard-Icons/Account.svg';
import logo from '../assets/logo.svg';
import HeaderButton from '../HeaderButton';

const NavigationBar = props =>
    <Navbar>
        <Navbar.Brand>
            <img src={logo} width='40' />
        </Navbar.Brand>
        <Nav className="m-auto">
            {props.navbarItems}
        </Nav>
        <HeaderButton icon={account} name="Menu" />
    </Navbar>
    ;

export default NavigationBar;

