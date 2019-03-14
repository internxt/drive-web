// import * as _ from 'lodash'
import * as React from 'react'
import { Dropdown } from 'react-bootstrap'

import './FileCommander.css'
import FileCommanderItem from './FileCommanderItem';
import * as moment from 'moment'
import DropdownArrowIcon from '../../assets/Dashboard-Icons/Dropdown\ arrow.svg';

const SORT_TYPES = {
    DATE_ADDED : 'Date_Added',
    SIZE_ASC : 'Size_Asc',
    SIZE_DESC : 'Size_Desc',
    NAME_ASC : 'Name_Asc',
    NAME_DESC : 'Name_Desc',
    FILETYPE_ASC : 'File_Type_Asc',
    FILETYPE_DESC : 'File_Type_Asc'
};

class FileCommander extends React.Component {
    constructor(props, state) {
        super(props, state);
        this.state = {
            currentCommanderItems: this.props.currentCommanderItems,
            // currentPath: [0, 'subFolders'],
            // allFolders: this.props.folderTree,
            namePath: this.props.namePath,
            // activeParent: {folder:'', bucket: '', name: ''}
        }
        this.myRef = React.createRef()
    }

    componentDidUpdate(prevProps) {
        if (this.props.currentCommanderItems !== prevProps.currentCommanderItems) {
            this.setState({ currentCommanderItems: this.props.currentCommanderItems })
        }
        if (this.props.namePath !== prevProps.namePath) {
            this.setState({ namePath: this.props.namePath })
        }
    }

    sortItems = (sortType) => {
        // Sort commander file items depending on option selected
        let sortFunc = null;
        switch (sortType) {
            case SORT_TYPES.DATE_ADDED:
            // At this time, default order is date added
                break;
            case SORT_TYPES.FILETYPE_ASC:
                sortFunc = function(a, b) { return a.type > b.type };
                break;
            case SORT_TYPES.FILETYPE_DESC:
                sortFunc = function(a, b) { return a.type < b.type };
                break;
            case SORT_TYPES.NAME_ASC:
                sortFunc = function(a, b) { return a.name.localeCompare(b.name) };
                break;
            case SORT_TYPES.NAME_DESC:
                sortFunc = function(a, b) { return b.name.localeCompare(a.name) };
                break;
            case SORT_TYPES.SIZE_ASC:
                sortFunc = function(a, b) { return a.size > b.size };
                break;
            case SORT_TYPES.SIZE_DESC:
                sortFunc = function(a, b) { return a.size < b.size };
                break;
            default:
                break;
        }
        this.props.setSortFunction(sortFunc);
    }

    onSelect = (eventKey, event) => { 
        if (event.target.active) {
            event.target.active = event.target.active ? false : true;
        } 
    }

    render() {
        const list = this.state.currentCommanderItems || 0
        const inRoot = this.state.namePath.length === 1

        return (
            <div id="FileCommander">
                <div id="FileCommander-info">
                    {
                        <div id="FileCommander-backTo" onClick={this.props.handleFolderTraverseUp.bind(this)}> 
                            {(this.state.namePath.length > 1 ? '< ' + this.state.namePath[this.state.namePath.length - 2].name : '')}
                        </div>
                    }
                    {
                        <div id="FileCommander-path">
                            <Dropdown className="dropdownButton">
                                <Dropdown.Toggle>
                                    {(this.state.namePath.length > 1 ? this.state.namePath[this.state.namePath.length - 1].name : "Home")}
                                    <img src={DropdownArrowIcon}/>
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => this.sortItems(SORT_TYPES.DATE_ADDED)} onSelect={this.onSelect} active>Date Added</Dropdown.Item>
                                    <Dropdown.Item onClick={() => this.sortItems(SORT_TYPES.SIZE_ASC)}>Size</Dropdown.Item>
                                    <Dropdown.Item onClick={() => this.sortItems(SORT_TYPES.NAME_ASC)}>Name</Dropdown.Item>
                                    <Dropdown.Item onClick={() => this.sortItems(SORT_TYPES.FILETYPE_ASC)}>File Type</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                            
                        </div>
                    }
                </div>
                <div id="FileCommander-items">
                    {
                        list.length > 0 ? (
                            list.map((item, i) => {
                                return (
                                    <span key={i} >
                                        {item.type === 'Folder' ?
                                            <FileCommanderItem
                                                ref={this.myRef}
                                                id={item.id}
                                                name={item.name}
                                                type={item.type}
                                                bucket={item.bucket}
                                                created={moment(item.created).format('dddd')}
                                                clickHandler={this.props.openFolder.bind(null, item.id)}
                                                selectHandler={(e) => this.props.selectCommanderItem(i, e)}
                                            />
                                            :
                                            <FileCommanderItem
                                                ref={this.myRef}
                                                id={item.id}
                                                name={item.name}
                                                type={item.type}
                                                bucket={item.bucketId}
                                                created={moment(item.created).format('dddd')}
                                                clickHandler={this.props.downloadFile.bind(null, item.bucketId)}
                                                selectHandler={(e) => this.props.selectCommanderItem(i, e)}
                                            />
                                        }
                                    </span>
                                )
                            })
                        ) : (
                                inRoot ? (
                                    <div className="noItems">
                                        <h1>Your X Cloud is empty.</h1>
                                        <h4>Click the upload button to get started.</h4>
                                    </div>
                                ) : (

                                        <div className="noItems">
                                            <h1>This folder is empty.</h1>
                                        </div>
                                    )
                            )
                    }
                </div>
            </div>
        );
    }
}

export default FileCommander;