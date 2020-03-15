// import * as _ from 'lodash'
import * as React from 'react'
import { Dropdown } from 'react-bootstrap'
import async from 'async'

import './FileCommander.scss'
import FileCommanderItem from './FileCommanderItem';
import DropdownArrowIcon from '../../assets/Dashboard-Icons/Dropdown arrow.svg';
import BackToIcon from '../../assets/Dashboard-Icons/back-arrow.svg';

const SORT_TYPES = {
    DATE_ADDED: 'Date_Added',
    SIZE_ASC: 'Size_Asc',
    SIZE_DESC: 'Size_Desc',
    NAME_ASC: 'Name_Asc',
    NAME_DESC: 'Name_Desc',
    FILETYPE_ASC: 'File_Type_Asc',
    FILETYPE_DESC: 'File_Type_Asc'
};

class FileCommander extends React.Component {
    constructor(props, state) {
        super(props, state);
        this.state = {
            currentCommanderItems: this.props.currentCommanderItems,
            namePath: this.props.namePath,
            selectedSortType: SORT_TYPES.DATE_ADDED,
            dragDropStyle: ''
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.currentCommanderItems !== prevProps.currentCommanderItems || this.props.namePath !== prevProps.namePath) {
            this.setState({
                currentCommanderItems: this.props.currentCommanderItems,
                namePath: this.props.namePath
            })
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
                sortFunc = function (a, b) { return a.type.localeCompare(b.type) };
                break;
            case SORT_TYPES.FILETYPE_DESC:
                sortFunc = function (a, b) { return b.type.localeCompare(a.type) };
                break;
            case SORT_TYPES.NAME_ASC:
                sortFunc = function (a, b) { return a.name.localeCompare(b.name) };
                break;
            case SORT_TYPES.NAME_DESC:
                sortFunc = function (a, b) { return b.name.localeCompare(a.name) };
                break;
            case SORT_TYPES.SIZE_ASC:
                sortFunc = function (a, b) { return a.size - b.size };
                break;
            case SORT_TYPES.SIZE_DESC:
                sortFunc = function (a, b) { return a.size - b.size };
                break;
            default:
                break;
        }
        this.props.setSortFunction(sortFunc);
    }

    onSelect = (eventKey, event) => {
        // Change active class to option selected only if its not the currently active
        if (!event.target.className.includes('active')) {
            document.getElementById(this.state.selectedSortType).className = document.getElementById(this.state.selectedSortType).className.split(" ")[0];
            event.target.className = event.target.className + ' active';
            this.setState({ selectedSortType: event.target.id })
        }
    }

    handleDragOver = (e) => {
        // Disable drop files for fileCommander files
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            e.stopPropagation()
            this.setState({ dragDropStyle: 'drag-over' });
        }
    }

    handleDragOverBackButton = (event) => {
        // Determine parent folder
        var parentFolder = this.state.namePath[this.state.namePath.length - 2] && this.state.namePath[this.state.namePath.length - 2].id; // Get the MySQL ID of parent folder

        // Allow only drop files into back button if is not parent folder
        if (parentFolder && event.dataTransfer.types && event.dataTransfer.types[0] === 'text/plain') {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    handleDropOverBackButton = (event) => {
        // Determine parent folder
        var parentFolder = this.state.namePath[this.state.namePath.length - 2] && this.state.namePath[this.state.namePath.length - 2].id; // Get the MySQL ID of parent folder

        // Recover data from the original object that has been dragged
        var data = JSON.parse(event.dataTransfer.getData('text/plain'));

        if (parentFolder) {
            this.props.moveFile(data.id, parentFolder);
        }
    }

    handleDragLeave = (e) => { this.setState({ dragDropStyle: '' }) }

    handleDrop = (e) => {
        e.preventDefault()
        let items = e.dataTransfer.items;

        async.map(items, (item, nextItem) => {
            let entry = item ? item.webkitGetAsEntry() : null
            if (entry) {
                this.traverseFileTree(entry).then(() => {
                    nextItem()
                }).catch(err => {
                    nextItem(err)
                })
            } else {
                nextItem()
            }
        }, (err) => {
            if (err) {
                let errmsg = err.error ? err.error : err
                if (errmsg.includes('already exist')) {
                    errmsg = 'Folder with same name already exists'
                }
                alert(errmsg)
            }
                this.props.getFolderContent(this.props.currentFolderId)
        })

        e.stopPropagation()
        this.setState({ dragDropStyle: '' })
    }

    traverseFileTree = (item, path = "", uuid = null) => {
        return new Promise((resolve, reject) => {
            if (item.isFile) {
                // Get file
                item.file((file) => { this.props.uploadDroppedFile([file], uuid).then(resolve).catch(reject); })
            } else if (item.isDirectory) {
                this.props.createFolderByName(item.name, uuid).then(data => {
                    let folderParent = data.id;
                    let dirReader = item.createReader();

                    dirReader.readEntries((entries) => {
                        async.eachSeries(entries, (entry, nextEntry) => {
                            this.traverseFileTree(
                                entry,
                                path + item.name + "/",
                                folderParent
                            ).then(() => nextEntry()).catch(nextEntry);
                        }, (err) => {
                            if (err) { reject(err) }
                            else { resolve() }
                        })
                    });
                }).catch(err => {
                    reject(err)
                });
            }


        })
    }

    render() {

        const list = this.state.currentCommanderItems || 0
        const inRoot = this.state.namePath.length === 1

        return (
            <div id="FileCommander">
                <div id="FileCommander-info">
                    {
                        <div id="FileCommander-backTo" onClick={this.props.handleFolderTraverseUp.bind(this)} onDragOver={this.handleDragOverBackButton} onDrop={this.handleDropOverBackButton}>
                            {(this.state.namePath.length > 1 ? <span><img src={BackToIcon} alt="Back" /> {this.state.namePath[this.state.namePath.length - 2].name}</span> : '')}
                        </div>
                    }
                    {
                        <div id="FileCommander-path">
                            <Dropdown className="dropdownButton">
                                <Dropdown.Toggle>
                                    {(this.state.namePath.length > 1 ? this.state.namePath[this.state.namePath.length - 1].name : "All Files")}
                                    <img src={DropdownArrowIcon} alt="Dropdown" />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item id={SORT_TYPES.DATE_ADDED} onClick={() => this.sortItems(SORT_TYPES.DATE_ADDED)} onSelect={this.onSelect} active>Date Added</Dropdown.Item>
                                    <Dropdown.Item id={SORT_TYPES.SIZE_ASC} onClick={() => this.sortItems(SORT_TYPES.SIZE_ASC)} onSelect={this.onSelect}>Size</Dropdown.Item>
                                    <Dropdown.Item id={SORT_TYPES.NAME_ASC} onClick={() => this.sortItems(SORT_TYPES.NAME_ASC)} onSelect={this.onSelect}>Name</Dropdown.Item>
                                    <Dropdown.Item id={SORT_TYPES.FILETYPE_ASC} onClick={() => this.sortItems(SORT_TYPES.FILETYPE_ASC)} onSelect={this.onSelect}>File Type</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    }
                </div>
                <div id="FileCommander-items"
                    className={this.state.dragDropStyle}
                    onDragOver={this.handleDragOver}
                    onDragLeave={this.handleDragLeave}
                    onDrop={this.handleDrop}
                >
                    {list.length > 0 ? list.map((item, i) => {
                        return (
                            <FileCommanderItem
                                key={item.id + '' + i} selectableKey={item.id}
                                ref={this.myRef}
                                id={item.id}
                                rawItem={item}
                                name={item.name}
                                type={item.type}
                                size={item.size}
                                bucket={item.bucket}
                                created={item.created_at}
                                icon={item.icon}
                                color={item.color ? item.color : 'blue'}
                                clickHandler={item.isFolder ? this.props.openFolder.bind(null, item.id) : this.props.downloadFile.bind(null, item.fileId)}
                                selectHandler={this.props.selectItems}
                                isLoading={!!item.isLoading}
                                isDownloading={!!item.isDownloading}
                                moveFile={this.props.moveFile}
                                updateMeta={this.props.updateMeta}
                                hasParentFolder={!inRoot}
                                isFolder={item.isFolder}
                                isSelected={item.isSelected}
                            />
                        )
                    }) : (inRoot ?
                        <div className="noItems">
                            <h1>Your X Cloud is empty.</h1>
                            <h4 className="noItems-subtext">Click the upload button or drop files in this window to get started.</h4>
                        </div>
                        :
                        <div className="noItems"><h1>This folder is empty.</h1></div>)
                    }
                </div>
            </div >
        );
    }
}

export default FileCommander;
