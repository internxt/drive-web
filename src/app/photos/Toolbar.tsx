import { DownloadSimple, Share, Trash } from 'phosphor-react';

function Icon({ Target, onClick }: { Target: typeof DownloadSimple; onClick?: () => void }) {
  return (
    <div
      className={`${
        onClick ? 'cursor-pointer text-gray-80 hover:bg-gray-5 active:bg-gray-10' : 'text-gray-40'
      } flex h-10 w-10 items-center justify-center rounded-lg `}
      onClick={onClick}
    >
      <Target size={24} />
    </div>
  );
}

export default function Toolbar({
  className = '',
  onDeleteClick,
  onDownloadClick,
  onShareClick,
}: {
  className?: string;
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onDeleteClick?: () => void;
}) {
  return (
    <div className={`${className} flex w-full items-center justify-end space-x-1 px-1`}>
      <Icon Target={DownloadSimple} onClick={onDownloadClick} />
      <Icon Target={Share} onClick={onShareClick} />
      <Icon Target={Trash} onClick={onDeleteClick} />
    </div>
  );
}
