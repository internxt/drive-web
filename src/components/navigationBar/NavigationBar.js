import React from 'react';
import { Nav, Navbar, ButtonToolbar, DropdownButton, Dropdown } from 'react-bootstrap';

// Assets
import account from '../../assets/Dashboard-Icons/Account.svg';
import logo from '../../assets/logo.svg';

import search from '../../assets/Dashboard-Icons/Search.svg';
import uploadFile from '../../assets/Dashboard-Icons/Upload.svg';
import newFolder from '../../assets/Dashboard-Icons/Add-folder.svg';
import downloadFile from '../../assets/Dashboard-Icons/Download.svg';
import deleteFile from '../../assets/Dashboard-Icons/Delete.svg';
import share from '../../assets/Dashboard-Icons/Share.svg';

import HeaderButton from '../../HeaderButton';
import DropdownItem from 'react-bootstrap/DropdownItem';
import DropdownToggle from 'react-bootstrap/DropdownToggle';

import "./NavigationBar.css";

const NavigationBar = props => {
    let menuButton;

    if (props.showMenuButton) {
        menuButton = <Dropdown drop="left" className="settingsButton">
            <Dropdown.Toggle><HeaderButton icon={account} name="Menu" /></Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item>Settings</Dropdown.Item>
                <Dropdown.Item onClick={(e) => { localStorage.clear(); }}>Logout</Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>;
    }

    if (props.fileButtons) {
        props.navbarItems =
            <div>
                <HeaderButton icon={search} name="Search files" />
                <HeaderButton icon={uploadFile} name="Upload file" clickHandler={props.uploadFile} />
                <HeaderButton icon={newFolder} name="New folder" clickHandler={props.createFolder} />
                <HeaderButton icon={downloadFile} name="Download" />
                <HeaderButton icon={deleteFile} name="Delete" clickHandler={props.deleteItems} />
                <HeaderButton icon={share} name="Share" />
            </div>;
    }

    return (
        <Navbar>
            <Navbar.Brand>
                <img src={logo} width='40' />
            </Navbar.Brand>
            <Nav className="m-auto">
                {props.navbarItems}
            </Nav>
            {menuButton}
        </Navbar>
    );
}

export default NavigationBar;

