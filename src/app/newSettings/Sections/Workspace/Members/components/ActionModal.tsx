import { Button } from '@internxt/ui';
import Modal from '../../../../../shared/components/Modal';

// TODO: MOVE TO COMPONENTS LIBRARY
const ActionModal = ({
  isOpen,
  onClose,
  onActionButtonClicked,
  isLoading,
  modalTexts,
  actionButtonVariant = 'destructive',
  children,
  modalWitdhClassname,
}: {
  isOpen: boolean;
  onActionButtonClicked: () => void;
  onClose: () => void;
  isLoading: boolean;
  actionButtonVariant?: 'primary' | 'destructive' | 'secondary' | 'ghost';
  modalTexts: {
    title: string;
    description: string;
    cancelButtonText: string;
    actionButtonText: string;
    actionLoadingButtonText: string;
  };
  children?: JSX.Element;
  modalWitdhClassname?: string;
}) => {
  return (
    <Modal isOpen={isOpen} className="p-5" width={modalWitdhClassname ?? 'w-96'} onClose={onClose}>
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
