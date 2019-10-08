import React from 'react'
import FolderTree from 'react-folder-tree'

class Tree extends React.Component {
    constructor(props) {
        super();

        this.state = {
            folderTree: []
        }
    }

    componentDidMount() {
        fetch(`${process.env.REACT_APP_API_URL}/api/storage/tree`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('xToken')}`
            }
        }).then(async res => {
            return { res, data: await res.json() }
        }).then(res => {
            this.setState({ folderTree: res.data })
        }).catch(err => {
            console.log(err)
        })
    }

    render() {
        console.log(this.state.folderTree)
        return <div>
            <FolderTree data={this.state.folderTree} />
        </div>
    }
}

export default Tree