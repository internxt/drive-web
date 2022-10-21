import { DownloadSimple } from 'phosphor-react';

function Icon({ Target, onClick }: { Target: typeof DownloadSimple; onClick?: () => void }): JSX.Element {
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

export { Icon };
