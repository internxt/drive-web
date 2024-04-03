import { UploadSimple, Users } from '@phosphor-icons/react';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import Empty from '../../../shared/components/Empty/Empty';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import { SharedNamePath } from 'app/share/types';

interface EmptySharedViewProps {
  onUploadFileButtonClicked: () => void;
  sharedNamePath: SharedNamePath[];
  isCurrentUserViewer: () => boolean;
}

const EmptySharedView = ({ onUploadFileButtonClicked, sharedNamePath, isCurrentUserViewer }: EmptySharedViewProps) => {
  const { translate } = useTranslationContext();

  const emptyState = {
    rootLink: (
      <div className="h-full w-full p-8">
        <div className="flex h-full w-full flex-col items-center justify-center pb-20">
          <div className="pointer-events-none mx-auto mb-10 w-max">
            <Users size={80} weight="thin" />
          </div>

          <div className="pointer-events-none flex w-full flex-col items-center justify-center text-center">
            <p className="mb-1 text-2xl font-medium text-gray-100">{translate('shared-links.empty-state.title')}</p>

            <p className="w-full max-w-xs items-center text-lg text-gray-60">
              {translate('shared-links.empty-state.subtitle')}
            </p>
          </div>
        </div>
      </div>
    ),
    viewer: (
      <Empty
        icon={<img className="w-36" alt="" src={folderEmptyImage} />}
        title={translate('views.recents.empty.folderEmpty')}
        subtitle={''}
      />
    ),
    ownerOrEditor: (
      <Empty
        icon={<img className="w-36" alt="" src={folderEmptyImage} />}
        title={translate('views.recents.empty.folderEmpty')}
        subtitle={translate('views.recents.empty.folderEmptySubtitle')}
        action={{
          icon: UploadSimple,
          style: 'elevated',
          text: translate('views.recents.empty.uploadFiles'),
          onClick: onUploadFileButtonClicked,
        }}
      />
    ),
  };

  if (sharedNamePath.length) {
    if (isCurrentUserViewer()) {
      return emptyState.viewer;
    } else {
      return emptyState.ownerOrEditor;
    }
  } else {
    return emptyState.rootLink;
  }
};

export default EmptySharedView;
