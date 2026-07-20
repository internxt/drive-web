import { FC } from 'react';
import { DotsThreeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DriveItemData } from 'app/drive/types';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import { Button, Dropdown, MenuItemType } from '@internxt/ui';
import { t } from 'i18next';
import TooltipElement, { DELAY_SHOW_MS } from 'components/TooltipElement';
import envService from 'services/env.service';
import { handleReportShare } from 'views/PublicShared/components/ReportButton';

interface TopBarActionsProps {
  background?: string;
  onDownload: () => void;
  file: DriveItemData;
  isAuthenticated: boolean;
  isShareView?: boolean;
  dropdownItems: Array<MenuItemType<DriveItemData>>;
}

const ICON_BUTTON_CLASSNAME =
  'flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white/0 font-medium outline-none transition duration-50 ease-in-out hover:bg-white/10 focus:bg-white/5 focus-visible:bg-white/5';

const TopBarActions: FC<TopBarActionsProps> = ({
  background,
  onDownload,
  file,
  isAuthenticated,
  isShareView,
  dropdownItems,
}: TopBarActionsProps) => {
  const { translate } = useTranslationContext();

  return (
    <div
      className={`${background} z-10 mt-3 flex h-11 shrink-0 flex-row items-center justify-end space-x-2 rounded-lg`}
    >
      <div className="flex flex-row items-center justify-center space-x-2">
        <button onClick={onDownload} title={translate('actions.download')} className={ICON_BUTTON_CLASSNAME}>
          <UilImport size={20} />
        </button>
        {isShareView && (
          <button onClick={handleReportShare} title={translate('actions.report')} className={ICON_BUTTON_CLASSNAME}>
            <WarningCircleIcon size={20} />
          </button>
        )}
      </div>
      {!isShareView && file && isAuthenticated && (
        <Dropdown
          classButton="flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white/0 font-medium outline-none transition duration-50 ease-in-out hover:bg-white/10"
          openDirection="right"
          classMenuItems="z-20 right-0 mt-0 flex flex-col rounded-lg bg-surface dark:bg-gray-5 shadow-subtle-hard min-w-[180px]"
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
              <DotsThreeIcon size={24} />
            </div>
            <TooltipElement id="more-tooltip" delayShow={DELAY_SHOW_MS} />
          </div>
        </Dropdown>
      )}
      {!isShareView && !isAuthenticated && (
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            window.location.href = envService.getVariable('hostname') + '/login';
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
