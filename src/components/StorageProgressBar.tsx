import React from 'react';
import { ProgressBar } from 'react-bootstrap';

import './StorageProgressBar.scss';

interface StorageProgressBarState {
    max: Number
    now: Number
}

class StorageProgressBar extends React.Component<StorageProgressBarState, StorageProgressBarState> {
    state = {
      max: 100,
      now: 0
    }

    componentDidUpdate(newProps: StorageProgressBarState) {
      if (newProps.max !== this.state.max || newProps.now !== this.state.now) {
        this.setState(newProps);
      }
    }

    render() {
      return <ProgressBar className="StorageProgressBar" max={this.state.max} now={this.state.now} />;
    }
}

export default StorageProgressBar;