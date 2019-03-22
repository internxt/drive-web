import * as React from 'react';
import './FileCommanderItem.css';
import icon from '../../assets/Folders/Folder-Blue.svg'
import ActivityIndicator from '../ActivityIndicator'

class FileCommanderItem extends React.Component {
    constructor(props, state) {
        super(props, state)
        this.state = {
            selected: false
        }
    }

    render() {
        return (
            <div className={`FileCommanderItem (this.state.selected ? 'selected' : '')`}
                data-type={this.props.type}
                data-id={this.props.id}
                data-bucket={this.props.bucket}
                onClick={this.props.selectHandler}
                onDoubleClick={this.props.clickHandler} >
                <div className="properties">...</div>
                {this.props.type === 'Folder' ?
                    <img src={icon} alt="" />
                    :
                    <div className="type">{this.props.isLoading ? <span><ActivityIndicator /></span> : <span>{this.props.type}</span>}</div>
                }
                <div className="name" onClick={this.props.clickHandler}>{this.props.name}</div>
                {/* {props.type !== 'Folder' &&
                <div className="created">{props.created}</div>
            } */}
            </div>)
    }
}

export default FileCommanderItem