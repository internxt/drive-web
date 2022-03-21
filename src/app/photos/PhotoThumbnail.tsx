import { Check } from 'phosphor-react';

export default function PhotoThumbnail({
  className = '',
  src,
  selected,
  onSelect,
  onClick,
}: {
  className?: string;
  src?: string;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}): JSX.Element {
  return (
    <div className={`${className} group relative ${src ? 'cursor-pointer' : ''}`} style={{ aspectRatio: '1/1' }}>
      {src ? (
        <img
          onClick={onClick}
          className={`h-full w-full object-cover ${selected ? 'rounded-lg brightness-80 filter' : 'active:rounded-lg'}`}
          src={src}
        />
      ) : (
        <div className="relative h-full w-full overflow-hidden bg-gray-5">
          <div
            className="absolute inset-0 h-full w-full -translate-x-full transform bg-gradient-to-r from-gray-5 via-white to-gray-5 opacity-30"
            style={{ animation: 'shimmer 2s infinite' }}
          />
        </div>
      )}
      <div
        onClick={onSelect}
        className={`${
          selected
            ? 'flex bg-primary active:bg-primary-dark'
            : 'hidden  bg-white bg-opacity-25 active:bg-opacity-50 group-hover:flex'
        } absolute left-3 top-3 box-content h-6 w-6 items-center justify-center rounded-full border-2 border-white`}
      >
        <Check className={selected ? 'block' : 'hidden'} color="white" />
      </div>
    </div>
  );
}
