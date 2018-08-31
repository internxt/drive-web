import * as React from 'react';
import './FileCommanderItem.css';
import icon from './assets/Folders/Folder-Blue.svg'

const FileCommanderItem = props => {
    return (
        <div className="FileCommanderItem" onClick={props.clickHandler}>
            { props.type === 'Folder' ?
                <img src={icon} alt=""/>
                : 
                <div className="type">
                    <span>{props.type}</span>
                </div>
            }
            <div className="name">{props.name}</div>
            {/* {props.type !== 'Folder' &&
                <div className="created">{props.created}</div>
            } */}
        </div>
    )
};

export default FileCommanderItem;