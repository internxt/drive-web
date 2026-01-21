import { Button, Checkbox } from '@internxt/ui';
import { Question } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DELAY_SHOW_MS } from 'components';
import { Tooltip } from 'react-tooltip';

interface ProtectWithPasswordProps {
  isPasswordProtected: boolean;
  onPasswordCheckboxChange: () => void;
  isPasswordSharingAvailable: boolean;
  onChangePassword: () => void;
}

export const ProtectWithPassword = ({
  isPasswordProtected,
  onPasswordCheckboxChange,
  isPasswordSharingAvailable,
  onChangePassword,
}: ProtectWithPasswordProps) => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col space-y-2.5">
        <div className="flex items-center">
          <Checkbox checked={isPasswordProtected} onClick={onPasswordCheckboxChange} />
          <p className={`ml-2 select-none text-base font-medium ${isPasswordSharingAvailable ? '' : 'text-gray-50'}`}>
            {translate('modals.shareModal.protectSharingModal.protect')}
          </p>
          {isPasswordSharingAvailable ? (
            <>
              <Question
                size={20}
                className="ml-2 flex items-center justify-center font-medium text-gray-50"
                data-tooltip-id="uploadFolder-tooltip"
                data-tooltip-place="top"
              />
              <Tooltip id="uploadFolder-tooltip" delayShow={DELAY_SHOW_MS} className="z-40 rounded-md">
                <p className="break-word w-60 text-center text-white">
                  {translate('modals.shareModal.protectSharingModal.protectTooltipText')}
                </p>
              </Tooltip>
            </>
          ) : (
            <div className="py-1 px-2 ml-2 rounded-md bg-gray-5">
              <p className="text-xs font-semibold">{translate('actions.locked')}</p>
            </div>
          )}
        </div>
      </div>
      {isPasswordProtected && (
        <Button variant="secondary" onClick={onChangePassword}>
          <span>{translate('modals.shareModal.protectSharingModal.buttons.changePassword')}</span>
        </Button>
      )}
    </div>
  );
};
