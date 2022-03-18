import { DownloadSimple, Share, Trash } from 'phosphor-react';

function Icon({ Target, onClick }: { Target: typeof DownloadSimple; onClick: () => void }) {
  return (
    <div
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-gray-80 hover:bg-gray-5 active:bg-gray-10"
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
  onDownloadClick: () => void;
  onShareClick: () => void;
  onDeleteClick: () => void;
}) {
  return (
    <div className={`${className} flex w-full items-center justify-end space-x-1 px-2`}>
      <Icon Target={DownloadSimple} onClick={onDownloadClick} />
      <Icon Target={Share} onClick={onShareClick} />
      <Icon Target={Trash} onClick={onDeleteClick} />
    </div>
  );
}
