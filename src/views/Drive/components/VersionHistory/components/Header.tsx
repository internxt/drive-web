import { X } from '@phosphor-icons/react';

interface HeaderProps {
  title: string;
  onClose: () => void;
}

export const Header = ({ title, onClose }: HeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b border-gray-10 pt-[29px] pb-[20px] px-[24px]">
      <span className="text-lg font-medium text-gray-100">{title}</span>
      <button
        onClick={onClose}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-gray-5"
      >
        <X size={20} className="text-gray-80" />
      </button>
    </div>
  );
};
