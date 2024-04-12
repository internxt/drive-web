import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';

import Button from '../../../../shared/components/Button/Button';
import Modal from '../../../../shared/components/Modal';

const DeactivateMemberModal = ({
  isOpen,
  onClose,
  name,
  onDeactivate,
  isLoading,
}: {
  name: string;
  isOpen: boolean;
  onDeactivate: () => void;
  onClose: () => void;
  isLoading: boolean;
}) => {
  const { translate } = useTranslationContext();

  return (
    <Modal isOpen={isOpen} className="p-5" width={'w-96'} onClose={onClose}>
      <div className="flexflex-col space-y-5">
        <h1 className="text-2xl font-medium text-gray-80">
          {' '}
          {translate('preferences.workspace.members.deactivationModal.title')}
        </h1>
        <p className=" text-base font-normal text-gray-80">
          {translate('preferences.workspace.members.deactivationModal.description', { name })}
        </p>

        <div className="flex justify-end">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button loading={isLoading} variant="accent" className="ml-2" onClick={onDeactivate}>
            {isLoading ? 'Deactivating' : 'Deactivate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeactivateMemberModal;
