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
        this.myRef = React.createRef()
    }

    componentDidUpdate(prevProps) {
        if(this.props.currentCommanderItems !== prevProps.currentCommanderItems) {
            this.setState({ currentCommanderItems: this.props.currentCommanderItems}) }
        if(this.props.namePath !== prevProps.namePath) {
            this.setState({ namePath: this.props.namePath}) }
    }



    render() {
        const list = this.state.currentCommanderItems || 0
        const inRoot = this.state.namePath.length === 1

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
                        ): (
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