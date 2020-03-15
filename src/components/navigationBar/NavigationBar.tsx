import React from 'react';
import { Nav, Navbar, Dropdown, ProgressBar } from 'react-bootstrap';

// Assets
import account from '../../assets/Dashboard-Icons/Account.svg';
import logo from '../../assets/logo.svg';

import search from '../../assets/Dashboard-Icons/Search.svg';
import uploadFileIcon from '../../assets/Dashboard-Icons/Upload.svg';
import newFolder from '../../assets/Dashboard-Icons/Add-folder.svg';
//import downloadFile from '../../assets/Dashboard-Icons/Download.svg';
import deleteFile from '../../assets/Dashboard-Icons/Delete.svg';
import share from '../../assets/Dashboard-Icons/Share.svg';
import PrettySize from 'prettysize';

import HeaderButton from './HeaderButton';

import "./NavigationBar.scss";
import history from '../../lib/history';

import { getHeaders } from '../../lib/auth'

interface NavigationBarProps {
    navbarItems: JSX.Element
    showFileButtons?: Boolean
    setSearchFunction?: any
    uploadFile?: any
    createFolder?: any
    deleteItems?: any
    shareItem?: any
    uploadHandler?: any
}

interface NavigationBarState {
    navbarItems: JSX.Element
    menuButton: any
    barLimit: number
    barUsage: number
}

class NavigationBar extends React.Component<NavigationBarProps, NavigationBarState> {
    constructor(props: NavigationBarProps) {
        super(props);

            this.state = {
                menuButton: null,
                navbarItems: props.navbarItems,
                barLimit: 1024 * 1024 * 1024 * 2,
                barUsage: 0,
            };
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

        if (this.props.showFileButtons) {
            this.setState({
                navbarItems: <Nav className="m-auto">
                    <div className="top-bar">
                        <div className="search-container">
                            <input alt="Search files" className="search" required style={{ backgroundImage: 'url(' + search + ')' }} onChange={this.props.setSearchFunction} />
                        </div>
                    </div>

                    <HeaderButton icon={uploadFileIcon} name="Upload file" clickHandler={this.props.uploadFile} />
                    <HeaderButton icon={newFolder} name="New folder" clickHandler={this.props.createFolder} />
                    <HeaderButton icon={deleteFile} name="Delete" clickHandler={this.props.deleteItems} />
                    <HeaderButton icon={share} name="Share" clickHandler={this.props.shareItem} />
                    <input id="uploadFileControl" type="file" onChange={this.props.uploadHandler} multiple={true} />
                </Nav>
            })
        }


        fetch('/api/limit', {
            method: 'get',
            headers: getHeaders(true, false)
        }
        ).then(res => {
            return res.json();
        }).then(res2 => {
            this.setState({ barLimit: res2.maxSpaceBytes })
        }).catch(err => {
            console.log('Error on fetch /api/limit', err);
        });

        fetch('/api/usage', {
            method: 'get',
            headers: getHeaders(true, false)
        }
        ).then(res => {
            return res.json();
        }).then(res2 => {
            this.setState({ barUsage: res2.total })
        }).catch(err => {
            console.log('Error on fetch /api/usage', err);
        });
    }

    render() {
        let user: any = null;
        try {
            user = JSON.parse(localStorage.xUser || '{}');
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
                        <Dropdown.Toggle id="1"><HeaderButton icon={account} name="Menu" /></Dropdown.Toggle>
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

