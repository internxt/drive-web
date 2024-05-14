import Modal from '.';
import Button from '../Button/Button';

// TODO: MOVE TO COMPONENTS LIBRARY
const ActionModal = ({
  isOpen,
  onClose,
  onActionButtonClicked,
  isLoading,
  modalTexts,
  actionButtonVariant = 'accent',
  children,
}: {
  isOpen: boolean;
  onActionButtonClicked: () => void;
  onClose: () => void;
  isLoading: boolean;
  actionButtonVariant?: 'primary' | 'accent' | 'secondary' | 'tertiary';
  modalTexts: {
    title: string;
    description: string;
    cancelButtonText: string;
    actionButtonText: string;
    actionLoadingButtonText: string;
  };
  children?: JSX.Element;
}) => {
  return (
    <Modal isOpen={isOpen} className="p-5" onClose={onClose}>
      <div className="flexflex-col space-y-5">
        <h1 className="text-2xl font-medium text-gray-80">{modalTexts.title}</h1>
        <p className=" text-base font-normal text-gray-80">{modalTexts.description}</p>
        {children}
        <div className="flex justify-end">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {modalTexts.cancelButtonText}
          </Button>
          <Button loading={isLoading} variant={actionButtonVariant} className="ml-2" onClick={onActionButtonClicked}>
            {isLoading ? modalTexts.actionLoadingButtonText : modalTexts.actionButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ActionModal;
