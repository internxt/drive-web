import { Tray } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const AccessRequestsEmptyState = () => {
  const { translate } = useTranslationContext();
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Tray size={64} className="text-primary" />
      <p className="text-lg font-medium text-gray-100">{translate('modals.shareModal.requests.empty')}</p>
    </div>
  );
};

export default AccessRequestsEmptyState;
