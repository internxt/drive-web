import { useState } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Header, CurrentVersionItem, VersionItem, AutosaveSection } from './components';
import { FileVersion } from './types';

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isVersionHistorySidebarOpen);
  const item = useAppSelector((state: RootState) => state.ui.versionHistoryItem);
  const { translate } = useTranslationContext();

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
  ]);

  const [selectAllAutosave, setSelectAllAutosave] = useState(false);
  const autosaveVersions = versions.filter((v) => v.isAutosave);
  const totalAutosaveCount = autosaveVersions.length;

  const onClose = () => {
    dispatch(uiActions.setIsVersionHistorySidebarOpen(false));
  };

  const handleDeleteVersion = (versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  };

  const handleDeleteAllAutosave = () => {
    setVersions((prev) => prev.filter((v) => !v.isAutosave));
    setSelectAllAutosave(false);
  };

  if (!item) return null;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 transition-opacity" onClick={onClose} aria-hidden />}
      <div
        className={`absolute right-0 top-0 z-50 h-full w-80 transform bg-surface dark:bg-gray-1 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="flex h-full flex-col">
          <Header title={translate('modals.versionHistory.title')} onClose={onClose} />

          <div className="flex-1 overflow-y-auto">
            {versions
              .filter((v) => v.isCurrent)
              .map((version) => (
                <CurrentVersionItem key={version.id} version={version} />
              ))}

            <AutosaveSection
              totalAutosaveCount={totalAutosaveCount}
              selectAllAutosave={selectAllAutosave}
              onSelectAllChange={setSelectAllAutosave}
              onDeleteAll={handleDeleteAllAutosave}
            />

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

export default Sidebar;
