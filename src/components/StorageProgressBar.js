import React from 'react'
import { ProgressBar } from 'react-bootstrap';

import './StorageProgressBar.scss'

class StorageProgressBar extends React.Component {
    state = {
        max: 100,
        now: 0,
    }

    componentDidUpdate(newProps) {
        if (newProps.max !== this.state.max || newProps.now !== this.state.now) {
            this.setState(newProps);
        }
    }

    render() {
        return <ProgressBar className="StorageProgressBar" max={this.state.max} now={this.state.now} />;
    }
}

export default StorageProgressBar;