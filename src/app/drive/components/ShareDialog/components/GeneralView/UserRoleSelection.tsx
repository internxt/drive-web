import { Popover } from '@headlessui/react';
import { Button, Loader } from '@internxt/ui';
import { CaretDown, Check, Globe, Link, Users } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { AccessMode } from '../../types';

export const LoadingState = ({ isLoading }: { isLoading: boolean }) => {
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

        <Popover className="relative z-10">
          {({ open }) => (
            <>
              <Popover.Button as="div" className="z-1 outline-none">
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
              </Popover.Button>

              <Popover.Panel
                className={`absolute bottom-full z-0 mb-1 w-80 origin-bottom-left rounded-lg border border-gray-10 bg-surface p-1 shadow-subtle transition-all duration-50 ease-out ${
                  open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
                }`}
                static
              >
                {({ close }) => (
                  <>
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
                          close();
                        }}
                      >
                        <p className="text-base font-medium">
                          {translate('modals.shareModal.general.accessOptions.stopSharing')}
                        </p>
                      </button>
                    )}
                  </>
                )}
              </Popover.Panel>
            </>
          )}
        </Popover>
      </div>

      <Button variant="primary" onClick={onCopyLink}>
        <Link size={24} />
        <span>{translate('modals.shareModal.general.copyLink')}</span>
      </Button>
    </div>
  );
};
