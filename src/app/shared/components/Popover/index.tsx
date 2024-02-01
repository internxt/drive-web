import { Popover as HPopover, Transition } from '@headlessui/react';
import { ReactNode } from 'react';

export default function Popover({
  childrenButton,
  panel,
  className,
  classButton,
}: {
  childrenButton: ReactNode;
  panel: ReactNode;
  className?: string;
  classButton?: string;
}): JSX.Element {
  return (
    <HPopover style={{ lineHeight: 0 }} className={`relative ${className}`}>
      <HPopover.Button className={`cursor-pointer outline-none ${classButton}`}>{childrenButton}</HPopover.Button>

      <Transition
        enter="transition duration-100 ease-out"
        enterFrom="scale-95 opacity-0"
        enterTo="scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="scale-100 opacity-100"
        leaveTo="scale-95 opacity-0"
        className="z-50"
      >
        <HPopover.Panel className="absolute right-0 z-50 mt-1 rounded-md border border-gray-10 bg-surface py-1.5 shadow-subtle dark:bg-gray-5">
          {panel}
        </HPopover.Panel>
      </Transition>
    </HPopover>
  );
}
