import { useEffect, useState, useRef } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { X, Trash, Info, DotsThree, ClockCounterClockwise, DownloadSimple } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Checkbox, Dropdown, MenuItemType } from '@internxt/ui';
import { DriveItemData } from 'app/drive/types';
import dateService from 'services/date.service';

interface FileVersion {
  id: string;
  date: Date;
  userName: string;
  expiresInDays?: number;
  isAutosave?: boolean;
  isCurrent?: boolean;
}

const Header = ({ title, onClose }: { title: string; onClose: () => void }) => {
  return (
    <div className="flex items-center justify-between border-b border-gray-10 pt-[29px] pb-[20px] px-[24px]">
      <span className="text-lg font-medium text-gray-100">{title}</span>
      <button
        onClick={onClose}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-gray-5"
      >
        <X size={20} className="text-gray-80" />
      </button>
    </div>
  );
};

const CurrentVersionItem = ({ version }: { version: FileVersion }) => {
  return (
    <div className="group flex items-start justify-between border-b-[2.5px] border-gray-5 px-5 py-3 hover:bg-gray-1 dark:hover:bg-gray-5">
      <div className="flex min-w-0 flex-1 flex-col space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-gray-100">
            {dateService.format(version.date, 'MMM D, h:mm A')}
          </span>
          <span className="rounded bg-primary/10 px-[4px] py-[2px] text-xs font-semibold text-primary dark:bg-[#082D66] dark:text-[#72AAFF]">
            Current
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-full bg-gray-20 dark:bg-gray-60" />
          <span className="text-base text-gray-60 dark:text-gray-80">{version.userName}</span>
        </div>
      </div>
    </div>
  );
};

const VersionItem = ({ version, onDelete }: { version: FileVersion; onDelete: (id: string) => void }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [keepButtonVisible, setKeepButtonVisible] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<'right' | 'left'>('right');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setKeepButtonVisible(false);
      }
    };

    if (keepButtonVisible) {
      document.addEventListener('mousedown', handleClickOutside);

      // Calculate if dropdown fits below
      if (itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 200; // Approximate dropdown menu height

        if (spaceBelow < menuHeight) {
          setDropdownDirection('left'); // Actually means "up" in this context
        } else {
          setDropdownDirection('right'); // Means "down"
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [keepButtonVisible]);

  const handleRestore = () => {
    // TODO: Implement restore functionality
    setKeepButtonVisible(false);
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    setKeepButtonVisible(false);
  };

  const handleDelete = () => {
    onDelete(version.id);
    setKeepButtonVisible(false);
  };

  const handleItemClick = () => {
    setIsChecked(!isChecked);
  };

  const menuItems: Array<MenuItemType<FileVersion>> = [
    {
      name: 'Restore version',
      icon: ClockCounterClockwise,
      action: handleRestore,
    },
    {
      name: 'Download version',
      icon: DownloadSimple,
      action: handleDownload,
    },
    {
      separator: true,
    },
    {
      name: 'Delete version',
      icon: Trash,
      action: handleDelete,
    },
  ];

  return (
    <div
      ref={itemRef}
      className={`group px-6 cursor-pointer ${isChecked ? 'bg-primary/10' : 'hover:bg-gray-1'}`}
      onClick={handleItemClick}
    >
      <div className="flex min-w-0 flex-1 items-center justify-between border-b-[2.5px] border-gray-5 py-3">
        <div className="flex min-w-0 flex-1 items-center space-x-3">
          <Checkbox
            checked={isChecked}
            onCheckedChange={setIsChecked}
            className={`h-4 w-4 shrink-0 transition-opacity ${
              isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
          <div className="flex min-w-0 flex-1 flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-100">
                {dateService.format(version.date, 'MMM D, h:mm A')}
              </span>
            </div>
            {version.expiresInDays !== undefined && (
              <div className="flex items-center space-x-1 text-[12px] text-red-dark">
                <Info size={16} weight="regular" />
                <span>Expires in {version.expiresInDays} days</span>
              </div>
            )}
            <div className="flex items-center space-x-2 pt-1">
              <div className="h-6 w-6 rounded-full bg-gray-20 dark:bg-gray-60" />
              <span className="text-base text-gray-60 dark:text-gray-80">{version.userName}</span>
            </div>
          </div>
        </div>
        <div
          ref={dropdownRef}
          className={`shrink-0 transition-opacity ${
            keepButtonVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isChecked) {
              setIsChecked(true);
            }
            setKeepButtonVisible(true);
          }}
        >
          <Dropdown
            classButton={`flex h-9 w-9 items-center justify-center rounded-full ${
              isChecked ? 'hover:bg-primary/25' : 'hover:bg-gray-5'
            }`}
            classMenuItems={`z-20 right-0 flex flex-col rounded-lg bg-surface dark:bg-gray-5 border border-gray-10 shadow-subtle-hard min-w-[224px] ${
              dropdownDirection === 'left' ? 'bottom-0 mb-0' : 'mt-0'
            }`}
            openDirection={dropdownDirection}
            item={version}
            dropdownActionsContext={menuItems}
          >
            <DotsThree size={22} weight="bold" />
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

const VersionHistorySidebar = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isVersionHistoryDialogOpen);
  const item = useAppSelector((state: RootState) => state.ui.versionHistoryItem);
  const { translate } = useTranslationContext();

  // Mock data for now - this should come from API
  const [versions, setVersions] = useState<FileVersion[]>([
    {
      id: '1',
      date: new Date(),
      userName: 'Name',
      isCurrent: true,
    },
    {
      id: '2',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      userName: 'Name',
      expiresInDays: 4,
      isAutosave: true,
    },
    {
      id: '3',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      userName: 'Name',
      expiresInDays: 3,
    },
    {
      id: '4',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      userName: 'Name',
      expiresInDays: 2,
    },
    {
      id: '5',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
      userName: 'Name',
      expiresInDays: 1,
    },
    {
      id: '6',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      userName: 'Name',
      expiresInDays: 4,
    },
    {
      id: '7',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
      userName: 'Name',
      expiresInDays: 3,
    },
    {
      id: '8',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      userName: 'Name',
      expiresInDays: 4,
    },
    {
      id: '10',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
      userName: 'Name',
      expiresInDays: 3,
    },
  ]);

  const [selectAllAutosave, setSelectAllAutosave] = useState(false);
  const autosaveVersions = versions.filter((v) => v.isAutosave);
  const totalAutosaveCount = autosaveVersions.length;

  const onClose = () => {
    dispatch(uiActions.setIsVersionHistoryDialogOpen(false));
  };

  const handleDeleteVersion = (versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  };

  const handleDeleteAllAutosave = () => {
    setVersions((prev) => prev.filter((v) => !v.isAutosave));
    setSelectAllAutosave(false);
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
    }
  }, [isOpen]);

  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 z-40 transition-opacity" onClick={onClose} />}

      {/* Side Panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-80 transform bg-surface dark:bg-gray-1 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="flex h-full flex-col">
          <Header title={translate('modals.versionHistory.title')} onClose={onClose} />

          <div className="flex-1 overflow-y-auto">
            {/* Current Version */}
            {versions
              .filter((v) => v.isCurrent)
              .map((version) => (
                <CurrentVersionItem key={version.id} version={version} />
              ))}

            {/* Autosave versions section */}
            {totalAutosaveCount > 0 && (
              <div className="group flex items-center justify-between border-b-[2.5px] border-gray-5 px-6 py-5 hover:bg-gray-1 dark:hover:bg-gray-5">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={selectAllAutosave}
                    onChange={(e) => setSelectAllAutosave(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base text-gray-80">
                      {totalAutosaveCount}/{totalAutosaveCount} autosave versions
                    </span>
                    <button className="flex items-center">
                      <Info size={20} className="text-gray-50" />
                    </button>
                  </div>
                </div>
                <button onClick={handleDeleteAllAutosave} className="flex items-center justify-center">
                  <Trash size={24} className="text-[#FF0D0080]" />
                </button>
              </div>
            )}

            {/* Other versions */}
            {versions
              .filter((v) => !v.isCurrent)
              .map((version) => (
                <VersionItem key={version.id} version={version} onDelete={handleDeleteVersion} />
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default VersionHistorySidebar;
