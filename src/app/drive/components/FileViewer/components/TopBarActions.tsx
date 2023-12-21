import { FC } from 'react';
import { DotsThree, Link } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DriveItemData } from 'app/drive/types';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import Button from '../../../../shared/components/Button/Button';
import { t } from 'i18next';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import Dropdown from 'app/shared/components/Dropdown';
import { ListItemMenu } from 'app/shared/components/List/ListItem';
import TooltipElement, { DELAY_SHOW_MS } from '../../../../shared/components/Tooltip/Tooltip';

const MenuItem = ({
  onClick,
  active,
  text,
  icon,
}: {
  onClick: () => void;
  active: boolean;
  text: string;
  icon: React.ReactNode;
}) => (
  <div
    onClick={onClick}
    onKeyDown={() => {}}
    className={`${active && 'bg-gray-5'} flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5`}
  >
    {icon}
    <p className="ml-3">{text}</p>
  </div>
);

interface TopBarActionsProps {
  background?: string;
  onDownload: () => void;
  file: DriveItemData;
  isAuthenticated: boolean;
  isShareView?: boolean;
  dropdownItems: ListItemMenu<DriveItemData>;
}

const TopBarActions: FC<TopBarActionsProps> = ({
  background,
  onDownload,
  file,
  isAuthenticated,
  isShareView,
  dropdownItems,
}: TopBarActionsProps) => {
  const { translate } = useTranslationContext();

  const copyNavigatorLink = () => {
    navigator.clipboard.writeText(window.location.href);
    notificationsService.show({ text: translate('success.linkCopied'), type: ToastType.Success });
  };

  return (
    <div
      className={`${background} z-10 mt-3 flex h-11 shrink-0 flex-row items-center justify-end space-x-2 rounded-lg`}
    >
      <div className="flex flex-row items-center justify-center space-x-2 px-5">
        {!isAuthenticated && isShareView && (
          <button
            onClick={copyNavigatorLink}
            title={translate('actions.copyLink')}
            className="flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white/0 font-medium outline-none transition duration-50 ease-in-out hover:bg-white/10 focus:bg-white/5 focus-visible:bg-white/5"
          >
            <Link size={20} />
          </button>
        )}
        <button
          onClick={onDownload}
          title={translate('actions.download')}
          className="flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white/0 font-medium outline-none transition duration-50 ease-in-out hover:bg-white/10 focus:bg-white/5 focus-visible:bg-white/5"
        >
          <UilImport size={20} />
        </button>
      </div>
      {file && isAuthenticated && (
        <Dropdown
          classButton="flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white/0 font-medium outline-none transition duration-50 ease-in-out hover:bg-white/10"
          openDirection="right"
          classMenuItems="z-20 right-0 mt-0 flex flex-col rounded-lg bg-white py-1.5 shadow-subtle-hard min-w-[180px]"
          item={file}
          dropdownActionsContext={dropdownItems}
        >
          <div
            className="flex items-center justify-center"
            data-tooltip-id="more-tooltip"
            data-tooltip-content={translate('actions.more')}
            data-tooltip-place="bottom"
          >
            <div className="aspect-square">
              <DotsThree size={24} />
            </div>
            <TooltipElement id="more-tooltip" delayShow={DELAY_SHOW_MS} />
          </div>
        </Dropdown>
      )}
      {!isAuthenticated && (
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            window.location.href = process.env.REACT_APP_HOSTNAME + '/login';
          }}
          className="px-5"
        >
          {t('auth.login.title')}
        </Button>
      )}
    </div>
  );
};

export default TopBarActions;
