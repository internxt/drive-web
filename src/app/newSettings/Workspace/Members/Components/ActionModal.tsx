import Button from '../../../../shared/components/Button/Button';
import Modal from '../../../../shared/components/Modal';

// TODO: MOVE TO COMPONENTS LIBRARY
const ActionModal = ({
  isOpen,
  onClose,
  onActionButtonClicked,
  isLoading,
  modalTexts,
}: {
  isOpen: boolean;
  onActionButtonClicked: () => void;
  onClose: () => void;
  isLoading: boolean;
  modalTexts: {
    title: string;
    description: string;
    cancelButtonText: string;
    actionButtonText: string;
    actionLoadingButtonText: string;
  };
}) => {
  return (
    <Modal isOpen={isOpen} className="p-5" width={'w-96'} onClose={onClose}>
      <div className="flexflex-col space-y-5">
        <h1 className="text-2xl font-medium text-gray-80">{modalTexts.title}</h1>
        <p className=" text-base font-normal text-gray-80">{modalTexts.description}</p>

        <div className="flex justify-end">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {modalTexts.cancelButtonText}
          </Button>
          <Button loading={isLoading} variant="accent" className="ml-2" onClick={onActionButtonClicked}>
            {isLoading ? modalTexts.actionLoadingButtonText : modalTexts.actionButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ActionModal;
