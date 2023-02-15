import { Transition } from '@headlessui/react';
import { useEffect } from 'react';
import Button from '../Button/Button';

export default function Dialog({
  isOpen,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  primaryActionColor,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  title: string;
  subtitle: string;
  primaryAction: string;
  secondaryAction: string;
  primaryActionColor: 'primary' | 'danger';
  isLoading?: boolean;
}): JSX.Element {
  useEffect(() => {
    if (!isOpen) return;

    const listener = (e) => {
      if (e.code === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [isOpen]);

  return (
    <Transition show={isOpen} className="z-50">
      <Transition.Child
        enter="ease-out duration-150"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      ></Transition.Child>
      <Transition.Child
        enter="ease-out duration-150"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
        className="absolute left-1/2 top-1/2 w-80 -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-3 text-center"
      >
        <h1 className="mt-4 text-xl font-semibold text-gray-80">{title}</h1>
        <p className="font-medium text-gray-50">{subtitle}</p>
        <div className="mt-6 flex h-10 space-x-2">
          <Button className="flex-1" variant="secondary" onClick={onSecondaryAction} disabled={isLoading}>
            {secondaryAction}
          </Button>
          <Button
            className="flex-1"
            onClick={onPrimaryAction}
            loading={isLoading}
            variant={primaryActionColor === 'primary' ? 'primary' : 'accent'}
          >
            {primaryAction}
          </Button>
        </div>
      </Transition.Child>
    </Transition>
  );
}
