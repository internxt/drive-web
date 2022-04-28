import { Check } from 'phosphor-react';

export default function PhotoThumbnail({
  className = '',
  src,
  selected,
  onSelect,
  onClick
}: {
  className?: string;
  src?: string;
  selected: boolean;
  onSelect?: () => void;
  onClick?: () => void;
}): JSX.Element {
  return (
    <div
      className={`${className} group relative ${src ? 'cursor-pointer' : ''} ${selected && 'p-1.5'} transition-all duration-100 ease-in-out`}
      style={{ aspectRatio: '1/1' }}
    >
      {src ? (
        <img
          onClick={onClick}
          className={`h-full w-full object-cover ${selected && 'rounded-lg brightness-80 filter'} transition-all duration-100 ease-in-out`}
          src={src}
          draggable="false"
        />
      ) : (
        <div className="relative h-full w-full overflow-hidden bg-gray-5">
          <div
            className="absolute inset-0 h-full w-full -translate-x-full transform bg-gradient-to-r from-gray-5 via-white to-gray-5 opacity-40"
            style={{ animation: 'shimmer 1s infinite' }}
          />
        </div>
      )}
      <div
        onClick={onSelect}
        className={`${
          src
            ? selected
              ? 'flex bg-primary active:bg-primary-dark'
              : 'hidden  bg-white bg-opacity-25 active:bg-opacity-50 group-hover:flex'
            : 'hidden'
        } absolute left-3 top-3 box-content h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-photo-select`}
      >
        <Check className={selected ? 'block' : 'hidden'} color="white" weight="bold" size={18} />
      </div>
    </div>
  );
}
