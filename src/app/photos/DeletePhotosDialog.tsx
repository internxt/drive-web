import { Transition } from '@headlessui/react';

export default function DeletePhotosDialog({
  isOpen,
  onClose,
  onConfirm,
  numberOfSelectedItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  numberOfSelectedItems: number;
}): JSX.Element {
  return (
    <Transition show={isOpen}>
      <Transition.Child
        enter="ease-out duration-150"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className={'absolute inset-0 bg-black bg-opacity-40'}
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
        <h1 className="mt-4 text-xl font-semibold text-gray-80">Delete {numberOfSelectedItems} selected items?</h1>
        <p className="font-medium text-gray-50">You can't undo this action</p>
        <div className="mt-6 flex h-10 space-x-2">
          <button onClick={onClose} className="flex-1 rounded-lg bg-gray-5 font-medium text-gray-80 active:bg-gray-10">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-60 font-medium text-white active:bg-red-70">
            Delete
          </button>
        </div>
      </Transition.Child>
    </Transition>
  );
}
