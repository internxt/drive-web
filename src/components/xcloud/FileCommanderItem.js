import * as React from 'react';
import $ from 'jquery';
import PrettySize from 'prettysize';
import { Dropdown, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import './FileCommanderItem.css';
import Icon from '../../assets/Icon'
import ActivityIndicator from '../ActivityIndicator'
import SanitizeFilename from 'sanitize-filename'

class FileCommanderItem extends React.Component {
    constructor(props, state) {
        super(props, state)
        this.state = {
            selected: false,
            dragDropStyle: '',
            itemName: this.props.name,
            selectedColor: '',
            selectedIcon: 0,
            showDropdown: false
        }

        // Folder colors definition
        this.colors = ['red', 'yellow', 'green', 'blue', 'purple', 'pink', 'grey'];
        // Folder icons definition (icon id is its index in array)
        this.icons = ['avatarcircleneutral', 'backup', 'barchart', 'bell', 'binoculars', 'book', 'bowl', 'camera', 'categories',
            'circlefilledcheckmark', 'clappboard', 'clipboard', 'cloud', 'controllerneoGeo', 'dollarsign', 'facehappy', 'file',
            'heartfilled', 'inbox', 'lighton', 'locklocked', 'musicnote', 'navigationcircle', 'notifications',
            'path', 'running', 'starfilled', 'video', 'window', 'yinyang'];
    }

    handleDragStart = (event) => {
        let data = {
            type: event.currentTarget.dataset.type,
            id: event.currentTarget.dataset.bridgeFileId
        }
        event.dataTransfer.setData('text/plain', JSON.stringify(data));

        // Highlight back button only if is not root folder

    }

    handleDragOver = (event) => {
        // Allow only drop files into folders
        if (this.props.type === 'Folder') {
            event.preventDefault();
            event.stopPropagation();
            this.setState({ dragDropStyle: 'dragOver' });
        }
    }

    handleDragLeave = (e) => {
        this.setState({ dragDropStyle: '' });
    }

    handleDragEnd = (e) => {
        $('#FileCommander-backTo').removeClass('drag-over');
    }

    handleDrop = (event) => {
        // Move file when its dropped
        var data = JSON.parse(event.dataTransfer.getData('text/plain'));
        this.props.moveFile(data.id, this.props.id);
        event.preventDefault();
        event.stopPropagation();
        this.setState({ dragDropStyle: '' });
    }

    handleNameChange = (event) => {
        this.setState({ itemName: event.target.value });
    }

    handleColorSelection = (value, event) => {
        this.setState({ selectedColor: value });
    }

    handleIconSelection = (value, event) => {
        this.setState({ selectedIcon: value });
    }

    handleApplyChanges = () => {
        let metadata = {};

        // Check if is a valid FILENAME for any OS

        if (this.props.name !== this.state.itemName) {
            const sanitizedFilename = SanitizeFilename(this.state.itemName)

            if (sanitizedFilename !== this.state.itemName) {
                return alert('Invalid file name')
            }
        }

        if (this.state.itemName && (this.props.name !== this.state.itemName)) metadata.itemName = this.state.itemName;
        if (this.props.type === 'Folder') {
            // Changes on folder item
            if (this.state.selectedColor && (this.props.color !== this.state.selectedColor)) metadata.color = this.state.selectedColor;
            if (this.state.selectedIcon && (!this.props.icon || this.props.icon.id !== this.state.selectedIcon)) metadata.icon = this.state.selectedIcon;

            if (metadata.itemName || metadata.color || metadata.icon) {
                this.props.updateFolderMeta(metadata, this.props.id, this.props.type);
            }
        } else {
            // Changes on file item
            if (metadata.itemName) {
                this.props.updateFileMeta(metadata, this.props.rawItem.fileId, this.props.type)
            }
        }

    }

    handleDropdownSelect = (isOpen, event, metadata) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        } else {
            // When click off window, close it and apply changes
            this.setState({ showDropdown: isOpen });
            if (isOpen === false) this.handleApplyChanges();
        }
    }

    handleShowDropdown = () => {
        // Save changes when dropdown is closed
        if (this.state.showDropdown === true) this.handleApplyChanges();
        else {
            // Set item name when open context menu
            this.setState({ itemName: this.props.name })
        }
        this.setState({ showDropdown: !this.state.showDropdown });
    }

    resetMetadataChanges = (event, reset) => {
        event.stopPropagation();
        switch (reset) {
            case 'icon':
                $("#iconToggle label").removeClass("active");
                this.setState({ selectedIcon: 0 });
                break;
            case 'color':
                $("#colorToggle label").removeClass("active");
                this.setState({ selectedColor: '' });
                break;
            default:
                $("#iconToggle label").removeClass("active");
                $("#colorToggle label").removeClass("active");
                this.setState({
                    selectedColor: '',
                    selectedIcon: 0
                })
                break;
        }
    }

    getFolderIcon = () => {
        let localColor = this.state.selectedColor ? this.state.selectedColor : this.props.color;
        if (this.props.icon || this.state.selectedIcon) {
            let localIcon = this.state.selectedIcon ? this.icons[this.state.selectedIcon - 1] : this.props.icon.name;

            return (
                <div className="iconContainer">
                    <Icon name="folder" color={localColor} height="75" alt="" />
                    <Icon className="folderIcon" name={localIcon} color={localColor} />
                </div>
            )
        } else {
            return (<Icon name="folder" color={localColor} height="75" alt="" />)
        }
    }

    getFileIcon = () => {
        return (<div className="type">{this.props.isLoading ? <span><ActivityIndicator /></span> : <span>{this.props.type}</span>}</div>)
    }

    render() {
        return (
            <div className={`FileCommanderItem` + (this.state.selected ? ' selected ' : ' ') + this.state.dragDropStyle}

                data-type={this.props.type}
                data-id={this.props.id}
                data-bridge-file-id={this.props.rawItem.fileId}
                data-bridge-bucket-id={this.props.rawItem.bucket}
                data-name={this.props.rawItem.name}

                onClick={this.props.selectHandler}
                onDoubleClick={(e) => { if (e.target.className === 'FileCommanderItem') { this.props.clickHandler(); } }}

                draggable={this.props.rawItem.type !== 'Folder'}
                onDragStart={this.handleDragStart}
                onDragOver={this.handleDragOver}
                onDragLeave={this.handleDragLeave}
                onDrop={this.handleDrop}
                onDragEnd={this.handleDragEnd}
            >
                <div className="properties">
                    {/* Item context menu changes depending on folder or file*/}
                    {this.props.type === 'Folder' ?
                        <Dropdown drop={'right'} show={this.state.showDropdown} onToggle={this.handleDropdownSelect}>
                            <Dropdown.Toggle as={CustomToggle} handleShowDropdown={this.handleShowDropdown} >...</Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item as="span">
                                    <input className="itemNameInput" type="text" value={this.state.itemName} onChange={this.handleNameChange} />
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item as="span">
                                    Style color
                            </Dropdown.Item>
                                <ToggleButtonGroup id="colorToggle" className="toggleGroup" name="colorSelection" type="radio" defaultValue={this.props.color} onChange={this.handleColorSelection}>
                                    {
                                        this.colors.map((value, i) => {
                                            return (<ToggleButton className={`${value}Color`} type="radio" key={i} value={value} />);
                                        })
                                    }
                                </ToggleButtonGroup>
                                <Dropdown.Divider className="ponleunnombre" />
                                <Dropdown.Item as="span">
                                    Cover icon
                            </Dropdown.Item>
                                <ToggleButtonGroup id="iconToggle" className="toggleGroup" name="iconSelection" type="radio" defaultValue={this.props.icon ? this.props.icon.id : ''} onChange={this.handleIconSelection}>
                                    {
                                        this.icons.map((value, i) => {
                                            return (<ToggleButton className={`${value}Icon`} type="radio" value={i + 1} key={i} />);
                                        })
                                    }
                                </ToggleButtonGroup>
                            </Dropdown.Menu>
                        </Dropdown> :
                        <Dropdown drop={'right'} show={this.state.showDropdown} onToggle={this.handleDropdownSelect}>
                            <Dropdown.Toggle as={CustomToggle} handleShowDropdown={this.handleShowDropdown}>...</Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item as="span"><input className="itemNameInput" type="text" value={this.state.itemName} onChange={this.handleNameChange} /></Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item as="span"><span className="propText">Type: </span>{this.props.type ? this.props.type.toUpperCase() : ''}</Dropdown.Item>
                                <Dropdown.Item as="span"><span className="propText">Size: </span>{PrettySize(this.props.size)}</Dropdown.Item>
                                {/* <Dropdown.Item eventKey="4" as="span"><span className="propText">Added: </span></Dropdown.Item> */}
                            </Dropdown.Menu>
                        </Dropdown>}
                </div>
                <div className="itemIcon">{this.props.type === 'Folder' ? this.getFolderIcon() : this.getFileIcon()}</div>
                <div className="name" onClick={this.props.clickHandler}>{this.props.name}</div>
                {this.props.type !== 'Folder' &&
                    <div className="created">{this.props.created}</div>
                }
            </div>)
    }
}

class CustomToggle extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick(e) {
        e.preventDefault();
        // Call dropdown to toggle show
        this.props.handleShowDropdown()
        this.props.onClick(e);
    }

    render() {
        return (
            <div onClick={this.handleClick}>{this.props.children}</div>
        );
    }
}

export default FileCommanderItem
