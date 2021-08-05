import React, { Component } from 'react';
import Skeleton from 'react-loading-skeleton';

interface DriveGridItemSkeletonState {
  itemRef: React.RefObject<HTMLDivElement>;
}

class DriveGridItemSkeleton extends Component<{}, DriveGridItemSkeletonState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      itemRef: React.createRef()
    };
  }

  componentDidMount() {
    this.updateHeight();

    window.addEventListener('resize', this.updateHeight);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateHeight);
  }

  updateHeight = () => {
    this.forceUpdate();
  }

  render(): JSX.Element {
    const { itemRef } = this.state;
    const height = itemRef.current ?
      this.state.itemRef.current?.clientWidth + 'px' :
      'auto';

    return (
      <div ref={itemRef} style={{ height }} className="rounded-lg" >
        <Skeleton width="100%" height="100%" />
      </div>
    );
  }
}

export default DriveGridItemSkeleton;