import React from 'react'
import { ProgressBar, Container } from 'react-bootstrap';

import './StorageProgressBar.scss'

class StorageProgressBar extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            max: props.max ? props.max : 100,
            now: props.now ? props.now : 0,
        }
    }

    componentWillReceiveProps(newProps) {
        this.setState(newProps);
    }

    render() {
        return <ProgressBar className="StorageProgressBar" max={this.state.max} now={this.state.now} />;
    }
}

export default StorageProgressBar;