// import * as _ from 'lodash'
import * as React from 'react'
import './FileCommander.css'
import FileCommanderItem from './FileCommanderItem';
import * as moment from 'moment'

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
    }

    componentDidUpdate(prevProps) {
        if(this.props.currentCommanderItems !== prevProps.currentCommanderItems) {
            this.setState({ currentCommanderItems: this.props.currentCommanderItems}) }
        if(this.props.namePath !== prevProps.namePath) {
            this.setState({ namePath: this.props.namePath}) }
    }

    render() {
        const list = this.state.currentCommanderItems || 0

        return (
            <div id="FileCommander">
                <div id="FileCommander-info">
                    {
                        this.state.namePath.length > 1 &&
                        <div id="FileCommander-backTo" onClick={this.props.handleFolderTraverseUp.bind(this)}>&lt; {this.state.namePath[this.state.namePath.length - 2].name}</div>
                    }
                    {
                        this.state.namePath.length > 1 &&
                        <div id="FileCommander-path" >{this.state.namePath[this.state.namePath.length - 1].name}</div>
                    }
                </div>
                <div id="FileCommander-items">
                    {
                        list.length > 0 ? (
                            list.map((item, i) => {
                                return (
                                    <span key={i} >
                                        {item.type === 'Folder'  ? 
                                            <FileCommanderItem name={item.name} type={item.type} created={moment(item.created).format('dddd')} id={item.id} clickHandler={this.props.openFolder.bind(null, item.id)} />
                                            :
                                            <FileCommanderItem name={item.name} created={moment(item.created).format('dddd')} clickHandler={this.props.downloadFile.bind(null, item.bucketId)} />
                                        }   
                                    </span>
                                )
                            })
                        ) : (
                            <h1>Empty</h1>
                        )
                    }
                </div>
            </div>
        );
    }
}

export default FileCommander;