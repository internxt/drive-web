import { useState } from 'react';
import { RadioGroup } from '@headlessui/react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import i18n from 'app/i18n/services/i18n.service';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';

interface NameCollisionDialogProps {
  onFolderCreated?: () => void;
  multiple?: boolean;
  itemName: string;
}

const NameCollisionDialog = ({ multiple, itemName }: NameCollisionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);

  const options = [
    {
      operation: 'replace',
      name: 'Replace current item',
    },
    {
      operation: 'keep',
      name: 'Keep both',
    },
  ];

  const [selectedOption, setSelectedOption] = useState(options[0]);

  const onClose = (): void => {
    setIsLoading(false);
    dispatch(uiActions.setIsNameCollisionDialogOpen(false));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!isLoading) {
      alert(selectedOption.operation);
    }
  };

  return (
    <Modal maxWidth="max-w-lg" isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col space-y-5" onSubmit={onSubmit}>
        <p className="text-2xl font-medium text-gray-100">
          {multiple ? 'Multiple items already exist' : 'Item already exists'}
        </p>
        <p className="text-base text-gray-80">
          {multiple ? 'More than one element' : `"${itemName}"`} already exists in this location. Do you want to replace
          it with with the one you're moving?
        </p>

        <RadioGroup value={selectedOption} onChange={setSelectedOption}>
          <RadioGroup.Label className="sr-only">Select an option</RadioGroup.Label>
          <div className="flex flex-col items-start space-y-3">
            {options.map((option) => (
              <RadioGroup.Option key={option.operation} value={option}>
                {({ checked }) => (
                  <>
                    <div className="flex cursor-pointer flex-row items-center space-x-1.5">
                      <div
                        className={`group flex h-5 w-5 flex-col items-center justify-center rounded-full ${
                          checked
                            ? 'bg-primary active:bg-primary-dark'
                            : 'border border-gray-40 bg-white active:border-gray-50'
                        }`}
                      >
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            checked ? 'bg-white' : 'bg-white group-hover:bg-gray-5 group-active:bg-gray-10'
                          }`}
                        />
                      </div>

                      <RadioGroup.Label as="p" className="font-medium">
                        {option.name}
                      </RadioGroup.Label>
                    </div>
                  </>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {i18n.get('actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} variant="primary">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
}))(NameCollisionDialog);
