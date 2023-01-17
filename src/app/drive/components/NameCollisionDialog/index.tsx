import { useEffect, useState } from 'react';
import { RadioGroup } from '@headlessui/react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import i18n from 'app/i18n/services/i18n.service';
import Button from 'app/shared/components/Button/Button';
import Modal from 'app/shared/components/Modal';

interface NameCollisionDialogProps {
  items: [{ name: string; id: string }];
  operationType: 'upload' | 'move';
}

const NameCollisionDialog = (props: NameCollisionDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isNameCollisionDialogOpen);

  useEffect(() => {
    // Reset to default values
    if (isOpen) {
      setIsLoading(false);
      setSelectedOption(options[0]);
    }
  }, [isOpen]);

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
    setIsLoading(true);

    //! You can access to the item id passed as props (items[X].id)

    if (props.operationType === 'upload') {
      if (selectedOption.operation === 'replace') {
        //TODO  Replace current item for the uploaded item
      } else {
        //TODO  Apply rename to uploaded item
      }
    } else {
      if (selectedOption.operation === 'replace') {
        //TODO  Replace current item for the moved item
      } else {
        //TODO  Apply rename to moved item
      }
    }

    //! Just for testting purposes, remove when functionality is finished
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <Modal maxWidth="max-w-lg" isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col space-y-5" onSubmit={onSubmit}>
        <p className="text-2xl font-medium text-gray-100">
          {props.items.length > 1 ? 'Multiple items already exist' : 'Item already exists'}
        </p>
        <p className="text-base text-gray-80">
          {props.items.length > 1 ? 'More than one element' : `"${props.items[0].name}"`} already exists in this
          location. Do you want to replace it with with the one you're moving?
        </p>

        <RadioGroup value={selectedOption} onChange={setSelectedOption} disabled={isLoading}>
          <RadioGroup.Label className="sr-only">Select an option</RadioGroup.Label>
          <div className="flex flex-col items-start space-y-3">
            {options.map((option) => (
              <RadioGroup.Option
                value={option}
                className="outline-none rounded-md ring-2 ring-primary ring-opacity-0 ring-offset-2 focus-visible:ring-opacity-50"
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
            {props.operationType === 'upload' ? 'Upload' : 'Move'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
}))(NameCollisionDialog);
