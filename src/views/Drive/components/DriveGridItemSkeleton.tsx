import { useState, createRef, useEffect } from 'react';
import useForceUpdate from 'app/core/hooks/useForceUpdate';
import Skeleton from 'react-loading-skeleton';

const DriveGridItemSkeleton = (): JSX.Element => {
  const [itemRef] = useState(createRef<HTMLDivElement>());
  const forceUpdate = useForceUpdate();
  const updateHeight = () => forceUpdate();
  const height = itemRef.current ? itemRef.current?.clientWidth + 'px' : 'auto';

  useEffect(() => {
    updateHeight();
    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <div ref={itemRef} style={{ height }} className="rounded-lg">
      <Skeleton width="100%" height="100%" />
    </div>
  );
};

export default DriveGridItemSkeleton;
