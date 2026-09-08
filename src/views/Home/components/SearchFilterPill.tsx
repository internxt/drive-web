import { CaretDownIcon } from '@phosphor-icons/react';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface SearchFilterPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active: boolean;
}

const SearchFilterPill = forwardRef<HTMLButtonElement, SearchFilterPillProps>(({ label, active, ...props }, ref) => (
  <button
    {...props}
    ref={ref}
    type="button"
    className={`${
      active
        ? 'bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20 dark:text-white dark:ring-primary/75'
        : 'bg-surface text-gray-80 ring-gray-10 hover:bg-gray-1 hover:shadow-sm hover:ring-gray-20 dark:bg-gray-5 dark:hover:bg-gray-10'
    } flex h-8 max-w-full cursor-pointer items-center space-x-2 rounded-full px-3 font-medium shadow-sm outline-none ring-1 transition-all duration-100 ease-out`}
  >
    <span className="truncate text-sm">{label}</span>
    <CaretDownIcon size={16} className="shrink-0" />
  </button>
));

SearchFilterPill.displayName = 'SearchFilterPill';

export default SearchFilterPill;
