import React from 'react';
import { Nav, Navbar, Dropdown, ProgressBar } from 'react-bootstrap';

// Assets
import account from '../../assets/Dashboard-Icons/Account.svg';
import logo from '../../assets/logo.svg';

import search from '../../assets/Dashboard-Icons/Search.svg';
import uploadFile from '../../assets/Dashboard-Icons/Upload.svg';
import newFolder from '../../assets/Dashboard-Icons/Add-folder.svg';
//import downloadFile from '../../assets/Dashboard-Icons/Download.svg';
import deleteFile from '../../assets/Dashboard-Icons/Delete.svg';
//import share from '../../assets/Dashboard-Icons/Share.svg';
import PrettySize from 'prettysize';

import HeaderButton from '../xcloud/HeaderButton';

import "./NavigationBar.css";
import history from '../../history';


class NavigationBar extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            menuButton: null,
            navbarItems: props.navbarItems,
            barLimit: 1024 * 1024 * 1024,
            barUsage: 0,
        };

        if (!localStorage.xUser) {
            return;
        }
        //const user = JSON.parse(localStorage.xUser);

        if (props.showFileButtons) {
            this.state.navbarItems =
                <Nav className="m-auto">
                    <div className="top-bar">
                        <div className="search-container">
                            <input alt="Search files" className="search" required style={{ backgroundImage: 'url(' + search + ')' }} onChange={props.setSearchFunction} />
                        </div>
                    </div>

                    <HeaderButton icon={uploadFile} name="Upload file" clickHandler={props.uploadFile} />
                    <HeaderButton icon={newFolder} name="New folder" clickHandler={props.createFolder} />
                    {/*<HeaderButton icon={downloadFile} name="Download" />*/}
                    <HeaderButton icon={deleteFile} name="Delete" clickHandler={props.deleteItems} />
                    {/*<HeaderButton icon={share} name="Share" />*/}
                    <input id="uploadFile" type="file" onChange={props.uploadHandler} />
                </Nav>;
        }
    }

    componentDidMount() {
        let user = null;
        try {
            user = JSON.parse(localStorage.xUser).email;
            if (user == null) {
                throw new Error();
            }
        } catch {
            history.push('/login');
            return;
            
        }

        fetch('/api/limit', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: user
            })
        }
        ).then(res => {
            return res.json();
        }).then(res2 => {
            this.setState({ barLimit: res2.maxSpaceBytes })
        }).catch(err => {
            console.log(err);
        });

        fetch('/api/usage', {
            method: 'post',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: user
            })
        }
        ).then(res => {
            return res.json();
        }).then(res2 => {
            this.setState({ barUsage: res2.total })
        }).catch(err => {
            console.log(err);
        });
    }

    render() {
        let user = null;
        try {
            user = JSON.parse(localStorage.xUser);
            if (user == null) {
                throw new Error();
            }
        } catch {
            history.push('/login');
            return "";
        }

        return (
            <Navbar id="mainNavBar">
                <Navbar.Brand>
                    <a href="/"><img src={logo} width='54.4' height='28.6' alt="Logo" /></a>
                </Navbar.Brand>
                <Nav className="m-auto">
                    {this.state.navbarItems}
                </Nav>
                <Nav style={{ margin: '0 13px 0 0' }}>
                    <Dropdown drop="left" className="settingsButton">
                        <Dropdown.Toggle><HeaderButton icon={account} name="Menu" /></Dropdown.Toggle>
                        <Dropdown.Menu>
                            <div className="dropdown-menu-group info">
                                <p className="name-lastname">{user.name} {user.lastname}</p>
                                <ProgressBar className="mini-progress-bar" now={this.state.barUsage} max={this.state.barLimit} />
                                <p className="space-used">Used <strong>{PrettySize(this.state.barUsage)}</strong> of <strong>{PrettySize(this.state.barLimit)}</strong></p>
                            </div>
                            <Dropdown.Divider />
                            <div className="dropdown-menu-group">
                                <Dropdown.Item onClick={(e) => { history.push('/storage'); }}>Storage</Dropdown.Item>
                                <Dropdown.Item onClick={(e) => { history.push('/settings'); }}>Settings</Dropdown.Item>
                                <Dropdown.Item onClick={(e) => { history.push('/security'); }}>Security</Dropdown.Item>
                                <Dropdown.Item href="mailto:hello@internxt.com">Contact us</Dropdown.Item>
                            </div>
                            <Dropdown.Divider />
                            <div className="dropdown-menu-group">
                                <Dropdown.Item onClick={(e) => { localStorage.clear(); window.location.reload(); }}>Sign out</Dropdown.Item>
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>
                </Nav>
            </Navbar>
        );
    }
}

export default NavigationBar;

