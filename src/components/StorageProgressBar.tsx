import React from 'react';
import { ProgressBar } from 'react-bootstrap';

import './StorageProgressBar.scss';

interface StorageProgressBarState {
    max: number
    now: number
}

class StorageProgressBar extends React.Component<StorageProgressBarState, StorageProgressBarState> {
    state = {
      max: 100,
      now: 0
    }

    componentDidUpdate() {
      if (this.props.max !== this.state.max || this.props.now !== this.state.now) {
        this.setState(this.props);
      }
    }

    render() {
      return <ProgressBar className="StorageProgressBar" max={this.state.max} now={this.state.now} />;
    }
}

export default StorageProgressBar;