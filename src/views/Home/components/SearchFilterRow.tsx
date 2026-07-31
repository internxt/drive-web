import { ReactNode } from 'react';

interface SearchFilterRowProps {
  onClick: () => void;
  children: ReactNode;
}

const SearchFilterRow = ({ onClick, children }: SearchFilterRowProps): JSX.Element => (
  <div
    role="none"
    className="flex cursor-pointer flex-row items-center gap-2 px-4 py-2 hover:bg-gray-5 dark:hover:bg-gray-10"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
  >
    {children}
  </div>
);

export default SearchFilterRow;
