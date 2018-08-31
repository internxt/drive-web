import * as React from 'react';
import account from './assets/Dashboard-Icons/Account.svg';
import newFolder from './assets/Dashboard-Icons/Add-folder.svg';
import deleteFile from './assets/Dashboard-Icons/Delete.svg';
import downloadFile from './assets/Dashboard-Icons/Download.svg';
import search from './assets/Dashboard-Icons/Search.svg';
import share from './assets/Dashboard-Icons/Share.svg';
import uploadFile from './assets/Dashboard-Icons/Upload.svg';
import logo from './assets/logo.svg';
import './Header.css';
import HeaderButton from './HeaderButton';

const logoStyle = {
    height: 46,
    width: 46
}

const Header = props => {
    return (
        <header>
            <div className="header-left">
                <img src={logo} alt="logo" className="logo" style={logoStyle}/>
            </div>
            <div className="header-middle">
                <HeaderButton icon={search} name="Search files" />
                <HeaderButton icon={uploadFile} name="Upload file" clickHandler={props.uploadFile} />
                <HeaderButton icon={newFolder} name="New folder" clickHandler={props.createFolder} />
                <HeaderButton icon={downloadFile} name="Download" />
                <HeaderButton icon={deleteFile} name="Delete" />
                <HeaderButton icon={share} name="Share" />
            </div>
            <div className="header-right">
                <HeaderButton icon={account} name="Menu" />
            </div>
            <input id="uploadFile" type="file" onChange={props.uploadHandler}/>
        </header>
    )
}

export default Header;