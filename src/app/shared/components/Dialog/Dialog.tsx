import { Transition } from '@headlessui/react';
import { useEffect } from 'react';
import { Button } from '@internxt/ui';

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
        className="absolute inset-0 z-50 bg-gray-100/50 dark:bg-black/75"
        onClick={onClose}
      ></Transition.Child>
      <Transition.Child
        enter="ease-out duration-150"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
        className="absolute left-1/2 top-1/2 z-[51] flex w-full max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col space-y-5 rounded-2xl bg-surface p-5 dark:bg-gray-1"
      >
        <div className="flex flex-col space-y-2">
          <p className="text-2xl font-medium text-gray-100">{title}</p>
          <p className="text-gray-60">{subtitle}</p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={onSecondaryAction} disabled={isLoading}>
            {secondaryAction}
          </Button>
          <Button
            onClick={onPrimaryAction}
            loading={isLoading}
            variant={primaryActionColor === 'primary' ? 'primary' : 'destructive'}
          >
            {primaryAction}
          </Button>
        </div>
      </Transition.Child>
    </Transition>
  );
}
