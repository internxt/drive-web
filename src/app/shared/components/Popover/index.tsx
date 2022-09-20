import { Popover as HPopover, Transition } from '@headlessui/react';
import { MouseEventHandler, ReactNode } from 'react';

export default function Popover({
  button,
  panel,
  className,
  onClick
}: {
  button: ReactNode;
  panel: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}): JSX.Element {
  return (
    <HPopover style={{ lineHeight: 0 }} className={`relative z-50 ${className}`}>
      <HPopover.Button className="cursor-pointer" onClick={onClick}>{button}</HPopover.Button>

      <Transition
        enter="transition duration-100 ease-out"
        enterFrom="scale-95 opacity-0"
        enterTo="scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="scale-100 opacity-100"
        leaveTo="scale-95 opacity-0"
      >
        <HPopover.Panel className="absolute right-0 z-50 mt-1 transform rounded-md border border-gray-10 bg-white py-1.5 shadow-subtle">
          {panel}
        </HPopover.Panel>
      </Transition>
    </HPopover>
  );
}
