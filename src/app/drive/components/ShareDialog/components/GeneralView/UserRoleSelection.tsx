import { Button, Loader, Popover } from '@internxt/ui';
import { CaretDown, Check, Globe, Link, Users } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { AccessMode } from '../../types';

const LoadingState = ({ isLoading }: { isLoading: boolean }) => {
  return (
    <div className="flex h-full w-5 items-center justify-center">
      {isLoading ? <Loader classNameLoader="h-5 w-5" /> : <Check size={20} />}
    </div>
  );
};

interface UserRoleSelectionProps {
  accessMode: AccessMode;
  isLoading: boolean;
  isUserOwner: boolean;
  isWorkspace: boolean;
  isRestrictedSharingAvailable: boolean;
  isStopSharingAvailable: boolean;
  onCopyLink: () => void;
  changeAccess: (accessMode: AccessMode) => void;
  setShowStopSharingConfirmation: (show: boolean) => void;
}

export const UserRoleSelection = ({
  accessMode,
  changeAccess,
  isLoading,
  isUserOwner,
  isWorkspace,
  isRestrictedSharingAvailable,
  isStopSharingAvailable,
  onCopyLink,
  setShowStopSharingConfirmation,
}: UserRoleSelectionProps) => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex items-end justify-between">
      <div className="flex flex-col space-y-2.5">
        <p className="font-medium">{translate('modals.shareModal.general.generalAccess')}</p>

        <Popover
          className="z-10"
          align="left"
          direction="up"
          childrenButton={
            <Button variant="secondary" disabled={isLoading || !isUserOwner}>
              {accessMode === 'public' ? <Globe size={24} /> : <Users size={24} />}
              <span>
                {accessMode === 'public'
                  ? translate('modals.shareModal.general.accessOptions.public.title')
                  : translate('modals.shareModal.general.accessOptions.restricted.title')}
              </span>
              {isLoading ? (
                <div className="flex h-6 w-6 items-center justify-center">
                  <Loader classNameLoader="h-5 w-5" />
                </div>
              ) : (
                <CaretDown size={24} />
              )}
            </Button>
          }
          panel={(closePopover) => (
            <div className="w-80 p-1">
              {/* Public */}
              <button
                className="flex h-16 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                onClick={() => changeAccess('public')}
              >
                <Globe size={32} weight="light" />
                <div className="flex flex-1 flex-col items-start">
                  <p className="text-base font-medium leading-none">
                    {translate('modals.shareModal.general.accessOptions.public.title')}
                  </p>
                  <p className="text-left text-sm leading-tight text-gray-60">
                    {translate('modals.shareModal.general.accessOptions.public.subtitle')}
                  </p>
                </div>
                <div className="flex h-full w-5 items-center justify-center">
                  {accessMode === 'public' && <LoadingState isLoading={isLoading} />}
                </div>
              </button>
              {/* Restricted */}
              {!isWorkspace && (
                <button
                  className="flex h-16 w-full cursor-pointer items-center justify-start space-x-3 rounded-lg px-3 hover:bg-gray-5"
                  onClick={() => changeAccess('restricted')}
                >
                  <Users size={32} weight="light" />
                  <div className="flex flex-1 flex-col items-start">
                    <div className="flex flex-row gap-2 items-center">
                      <p
                        className={`text-base font-medium leading-none ${isRestrictedSharingAvailable ? '' : 'text-gray-70'}`}
                      >
                        {translate('modals.shareModal.general.accessOptions.restricted.title')}
                      </p>
                      {!isRestrictedSharingAvailable && (
                        <div className="py-1 px-2 ml-2 rounded-md bg-gray-5">
                          <p className="text-xs font-semibold">{translate('actions.locked')}</p>
                        </div>
                      )}
                    </div>
                    <p
                      className={`text-left text-sm leading-tight ${isRestrictedSharingAvailable ? 'text-gray-60' : 'text-gray-70'}`}
                    >
                      {translate('modals.shareModal.general.accessOptions.restricted.subtitle')}
                    </p>
                  </div>
                  <div className="flex h-full w-5 items-center justify-center">
                    {accessMode === 'restricted' && <LoadingState isLoading={isLoading} />}
                  </div>
                </button>
              )}
              {/* Stop sharing */}
              {isStopSharingAvailable && (
                <button
                  className="flex h-11 w-full cursor-pointer items-center justify-start rounded-lg pl-14 pr-3 hover:bg-gray-5"
                  onClick={() => {
                    setShowStopSharingConfirmation(true);
                    closePopover();
                  }}
                >
                  <p className="text-base font-medium">
                    {translate('modals.shareModal.general.accessOptions.stopSharing')}
                  </p>
                </button>
              )}
            </div>
          )}
        />
      </div>

      <Button variant="primary" onClick={onCopyLink}>
        <Link size={24} />
        <span>{translate('modals.shareModal.general.copyLink')}</span>
      </Button>
    </div>
  );
};
