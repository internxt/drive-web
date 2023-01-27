import { FC, useEffect, useMemo, useState } from 'react';
import { RadioGroup } from '@headlessui/react';

import i18n from 'app/i18n/services/i18n.service';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';
import { DriveItemData } from '../../types';
import { IRoot } from '../../../store/slices/storage/storage.thunks/uploadFolderThunk';

export const OPERATION_TYPE = {
  UPLOAD: 'upload',
  MOVE: 'move',
} as const;

export type OnSubmitPressed = {
  operationType: 'move' | 'upload';
  operation: 'keep' | 'replace';
  itemsToUpload: (File | IRoot | DriveItemData)[];
  itemsToReplace: (DriveItemData | IRoot)[];
};

export interface NameCollisionDialogProps {
  operationType: 'upload' | 'move';
  isOpen: boolean;
  driveItems: (DriveItemData | IRoot)[];
  newItems: (File | IRoot)[];
  onCloseDialog(): void;
  onCancelButtonPressed(): void;
  onSubmitButtonPressed({ operationType, operation, itemsToUpload, itemsToReplace }: OnSubmitPressed): void;
}

const options = [
  {
    operation: 'replace' as const,
    name: i18n.get('modals.renameModal.replaceItem'),
  },
  {
    operation: 'keep' as const,
    name: i18n.get('modals.renameModal.keepBoth'),
  },
];

const NameCollisionDialog: FC<NameCollisionDialogProps> = ({
  isOpen,
  operationType,
  newItems,
  driveItems,
  onCancelButtonPressed,
  onCloseDialog,
  onSubmitButtonPressed,
}: NameCollisionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options[0]);

  const title =
    newItems?.length > 1 ? i18n.get('modals.renameModal.titleMultipleItems') : i18n.get('modals.renameModal.title');
  const description =
    newItems?.length > 1
      ? i18n.get('modals.renameModal.multipleDescription')
      : i18n.get('modals.renameModal.description', { itemName: newItems[0]?.name });
  const primaryButtonText = useMemo(
    () =>
      operationType === OPERATION_TYPE.MOVE
        ? i18n.get('modals.renameModal.move')
        : i18n.get('modals.renameModal.upload'),
    [operationType],
  );

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setSelectedOption(options[0]);
    }
  }, [isOpen]);

  const onClose = (): void => {
    onCloseDialog();
    onCancelButtonPressed();
    setSelectedOption(options[0]);
    setIsLoading(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    await onSubmitButtonPressed({
      operationType,
      operation: selectedOption.operation,
      itemsToUpload: newItems,
      itemsToReplace: driveItems,
    });

    onClose();
  };

  return (
    <Modal maxWidth="max-w-lg" isOpen={isOpen} onClose={onCloseDialog}>
      <form className="flex flex-col space-y-5" onSubmit={onSubmit}>
        <p className="text-2xl font-medium text-gray-100">{title}</p>
        <p className="text-base text-gray-80">{description}</p>

        <RadioGroup value={selectedOption} onChange={setSelectedOption} disabled={isLoading}>
          <RadioGroup.Label className="sr-only">Select an option</RadioGroup.Label>
          <div className="flex flex-col items-start space-y-3">
            {options.map((option) => (
              <RadioGroup.Option
                value={option}
                className="outline-none rounded-md ring-2 ring-primary ring-opacity-0 ring-offset-2 focus-visible:ring-opacity-50"
                key={option.operation}
              >
                <div className="group flex cursor-pointer flex-row items-center space-x-1.5">
                  <div
                    className={`flex h-5 w-5 flex-col items-center justify-center rounded-full ${
                      option.operation === selectedOption.operation
                        ? 'bg-primary active:bg-primary-dark'
                        : 'border border-gray-40 bg-white group-hover:border-gray-50'
                    }`}
                  >
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        option.operation === selectedOption.operation ? 'bg-white' : 'bg-white group-hover:bg-gray-5'
                      }`}
                    />
                  </div>

                  <RadioGroup.Label as="p" className="font-medium">
                    {option.name}
                  </RadioGroup.Label>
                </div>
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {i18n.get('actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} variant="primary">
            {primaryButtonText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default NameCollisionDialog;
