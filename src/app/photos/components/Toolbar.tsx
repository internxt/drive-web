import { DownloadSimple, Share, Trash, X } from 'phosphor-react';
import { Icon } from './Icon';

export default function Toolbar({
  className = '',
  onDeleteClick,
  onDownloadClick,
  onShareClick,
  onUnselectClick,
  numberOfSelectedItems,
}: {
  className?: string;
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onDeleteClick?: () => void;
  onUnselectClick?: () => void;
  numberOfSelectedItems: number;
}): JSX.Element {
  return (
    <div className={`${className} flex w-full items-center justify-between space-x-1 px-5 py-2`}>
      <div className={`flex items-center ${numberOfSelectedItems === 0 ? 'opacity-0' : ''}`}>
        <Icon Target={X} onClick={onUnselectClick} />
        <p style={{ paddingTop: '1px' }} className="ml-2 font-medium text-gray-80">
          {`${numberOfSelectedItems} ${numberOfSelectedItems > 1 ? 'Items' : 'Item'} selected`}
        </p>
      </div>

      <div className="flex">
        <Icon Target={DownloadSimple} onClick={onDownloadClick} />
        <Icon Target={Share} onClick={onShareClick} />
        <Icon Target={Trash} onClick={onDeleteClick} />
      </div>
    </div>
  );
}
