import { FC, useEffect, useMemo, useState } from 'react';
import { Label, Radio, RadioGroup } from '@headlessui/react';

import { Button, Checkbox, Modal } from '@internxt/ui';
import { DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { IRoot } from 'app/store/slices/storage/types';

export const OPERATION_TYPE = {
  UPLOAD: 'upload',
  MOVE: 'move',
} as const;

export type OnSubmitPressed = {
  operationType: 'move' | 'upload';
  operation: 'keep' | 'replace' | 'skip';
  itemsToUpload: (File | IRoot | DriveItemData)[];
  itemsToReplace: (DriveItemData | IRoot)[];
  applyToAll: boolean;
};

export interface NameCollisionDialogProps {
  operationType: 'upload' | 'move';
  isOpen: boolean;
  driveItems: (DriveItemData | IRoot)[];
  newItems: (File | IRoot)[];
  remainingItemsCount: number;
  onCloseDialog(): void;
  onCancelButtonPressed(): void;
  onSubmitButtonPressed({
    operationType,
    operation,
    itemsToUpload,
    itemsToReplace,
    applyToAll,
  }: OnSubmitPressed): Promise<void>;
}

const NameCollisionDialog: FC<NameCollisionDialogProps> = ({
  isOpen,
  operationType,
  newItems,
  driveItems,
  remainingItemsCount,
  onCancelButtonPressed,
  onCloseDialog,
  onSubmitButtonPressed,
}: NameCollisionDialogProps) => {
  const { translate } = useTranslationContext();
  const options = useMemo(() => {
    const collisionOptions: { operation: 'replace' | 'keep' | 'skip'; name: string }[] = [
      {
        operation: 'replace',
        name: translate('modals.alreadyExistsModal.replaceItem'),
      },
      {
        operation: 'keep',
        name: translate('modals.alreadyExistsModal.keepBoth'),
      },
    ];

    if (operationType === OPERATION_TYPE.UPLOAD) {
      collisionOptions.push({
        operation: 'skip',
        name: translate('modals.alreadyExistsModal.skipFile'),
      });
    }

    return collisionOptions;
  }, [operationType, translate]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const [applyToAll, setApplyToAll] = useState(false);

  const title = translate('modals.alreadyExistsModal.title');
  const description = translate('modals.alreadyExistsModal.description', { itemName: newItems?.[0]?.name });

  const primaryButtonText = useMemo(
    () =>
      operationType === OPERATION_TYPE.MOVE
        ? translate('modals.alreadyExistsModal.move')
        : translate('modals.alreadyExistsModal.upload'),
    [operationType],
  );

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setSelectedOption(options[0]);
      setApplyToAll(false);
    }
  }, [isOpen, options]);

  const onClose = (): void => {
    onCloseDialog();
    onCancelButtonPressed();
    setSelectedOption(options[0]);
    setApplyToAll(false);
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
      applyToAll,
    });

    setIsLoading(false);
  };

  return (
    <Modal maxWidth="max-w-lg" isOpen={isOpen} onClose={onCloseDialog}>
      <form className="flex flex-col space-y-5" onSubmit={onSubmit}>
        <p className="text-2xl font-medium text-gray-100">{title}</p>
        <p className="text-base text-gray-80">{description}</p>

        <RadioGroup value={selectedOption} onChange={setSelectedOption} disabled={isLoading}>
          <Label className="sr-only">{translate('modals.alreadyExistsModal.selectOption')}</Label>
          <div className="flex flex-col items-start space-y-3">
            {options.map((option) => (
              <Radio value={option} className="rounded-md outline-none" key={option.operation}>
                <div className="group flex cursor-pointer flex-row items-center space-x-1.5">
                  <div
                    className={`flex h-5 w-5 flex-col items-center justify-center rounded-full ${
                      option.operation === selectedOption.operation
                        ? 'bg-primary active:bg-primary-dark'
                        : 'border border-gray-40 bg-white dark:bg-transparent group-hover:border-gray-50'
                    }`}
                  >
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        option.operation === selectedOption.operation ? 'bg-white' : 'bg-white dark:bg-transparent group-hover:bg-gray-5'
                      }`}
                    />
                  </div>

                  <Label as="p" className="font-medium">
                    {option.name}
                  </Label>
                </div>
              </Radio>
            ))}
          </div>
        </RadioGroup>

        {remainingItemsCount > 1 && (
          <div className="flex items-center">
            <Checkbox checked={applyToAll} onClick={() => setApplyToAll((prev) => !prev)} />
            <p className="ml-2 select-none text-base font-medium text-gray-80">
              {translate('modals.alreadyExistsModal.applyToAll')}
            </p>
          </div>
        )}
        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
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
