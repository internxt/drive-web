import { Dialog, Transition } from '@headlessui/react';
import { Fragment, ReactNode } from 'react';

export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidth,
  className,
  width,
  preventClosing = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  width?: string;
  className?: string;
  preventClosing?: boolean;
}): JSX.Element {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={() => (preventClosing ? null : onClose())} static={preventClosing}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-50 bg-highlight/40" />
        </Transition.Child>
        {/*TODO: When integrate new Modal from UI, add overflow-y-auto in the new component from UI*/}
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={` ${width ?? 'w-full'} text-gray-100 ${maxWidth ?? 'max-w-lg'} ${
                  className ?? 'p-5'
                } rounded-2xl bg-surface shadow-subtle-hard transition-all duration-100 ease-out`}
              >
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
