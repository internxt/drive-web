import { ReactNode, forwardRef } from 'react';

const MenuItem = forwardRef(({ children, onClick }: { children: ReactNode; onClick: () => void }) => {
  return (
    <div
      role="button"
      onKeyDown={() => {}}
      className={'flex h-full w-full cursor-pointer px-3 py-2 text-gray-80 hover:bg-gray-5 active:bg-gray-10'}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

export default MenuItem;
