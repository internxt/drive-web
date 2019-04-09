import * as React from 'react';
import './FileCommanderItem.css';
import icon from '../../assets/Folders/Folder-Blue.svg'
import ActivityIndicator from '../ActivityIndicator'

class FileCommanderItem extends React.Component {
    constructor(props, state) {
        super(props, state)
        this.state = {
            selected: false,
            dragDropStyle: ''
        }
    }

    handleDragStart = (event) => {
        let data = {
            type: event.currentTarget.dataset.type,
            id: event.currentTarget.dataset.bucket
        }
        event.dataTransfer.setData('text/plain', JSON.stringify(data));
    }

    handleDragOver = (event) => {
        // Allow only drop files into folders
        if (this.props.type === 'Folder') {
            event.preventDefault();
            event.stopPropagation();
            this.setState({ dragDropStyle: 'dragOver' });
        }
    }

    handleDragLeave = (e) => { this.setState({ dragDropStyle: '' }) }

    handleDrop = (event) => {
        // Move file when its dropped
        var data = JSON.parse(event.dataTransfer.getData('text/plain'));
        this.props.moveFile(data.id, this.props.id);
        event.preventDefault();
        event.stopPropagation();
        this.setState({ dragDropStyle: '' });
    }

    render() {
        return (
            <div className={`FileCommanderItem (this.state.selected ? 'selected' : '') ${this.state.dragDropStyle}`}
                data-type={this.props.type}
                data-id={this.props.id}
                data-bucket={this.props.bucket}
                onClick={this.props.selectHandler}
                onDoubleClick={this.props.clickHandler} 
                draggable="true"
                onDragStart={this.handleDragStart}
                onDragOver={this.handleDragOver}
                onDragLeave={this.handleDragLeave}
                onDrop={this.handleDrop}
                >
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