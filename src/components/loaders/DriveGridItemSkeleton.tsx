import React, { Component, ComponentProps } from 'react';
import Skeleton from 'react-loading-skeleton';

interface DriveGridItemSkeletonState {
  itemRef: React.RefObject<HTMLDivElement>;
}

class DriveGridItemSkeleton extends Component<React.Attributes, DriveGridItemSkeletonState> {
  constructor(props: React.Attributes) {
    super(props);

    this.state = {
      itemRef: React.createRef(),
    };
  }

  componentDidMount(): void {
    this.updateHeight();

    window.addEventListener('resize', this.updateHeight);
  }

  componentWillUnmount(): void {
    window.removeEventListener('resize', this.updateHeight);
  }

  updateHeight = (): void => {
    this.forceUpdate();
  };

  render(): JSX.Element {
    const { itemRef } = this.state;
    const height = itemRef.current ? this.state.itemRef.current?.clientWidth + 'px' : 'auto';

    return (
      <div ref={itemRef} style={{ height }} className="rounded-lg">
        <Skeleton width="100%" height="100%" />
      </div>
    );
  }
}

export default DriveGridItemSkeleton;
