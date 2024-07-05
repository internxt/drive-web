import UilImport from '@iconscout/react-unicons/icons/uil-import';
import { FunctionComponent, SVGProps } from 'react';

interface DownloadItemComponentProps {
  onDownload: () => void;
  translate: (key: string, props?: Record<string, unknown> | undefined) => string;
}

interface NoPreviewIsAvailableProps {
  fileName: string;
  onDownload: () => void;
  translate: (key: string, props?: Record<string, unknown> | undefined) => string;
  ItemIconComponent: FunctionComponent<SVGProps<SVGSVGElement>>;
}

const DownloadItemComponent = ({ onDownload, translate }: DownloadItemComponentProps) => (
  <div className={'z-10 mt-3 flex h-11 shrink-0 flex-row items-center justify-end space-x-2 rounded-lg bg-primary'}>
    <button
      title={translate('actions.download')}
      onClick={onDownload}
      className="flex h-10 cursor-pointer flex-row items-center space-x-2 rounded-lg bg-white/0
                           px-6 font-medium transition duration-50
                          ease-in-out hover:bg-white/10 focus:bg-white/5"
    >
      <UilImport size={20} />
      <span className="font-medium">{translate('actions.download')}</span>
    </button>
  </div>
);

export const NoPreviewIsAvailableComponent = ({
  fileName,
  onDownload,
  translate,
  ItemIconComponent,
}: NoPreviewIsAvailableProps) => {
  return (
    <div
      className="z-10 flex select-none flex-col items-center justify-center space-y-6
                      rounded-xl font-medium outline-none"
    >
      <div className="flex flex-col items-center justify-center">
        <div className="flex h-20 w-20 items-center">
          <ItemIconComponent width={80} height={80} />
        </div>
        <span className="w-96 truncate pt-4 text-center text-lg" title={fileName}>
          {fileName}
        </span>
        <span className="text-white/50">{translate('error.noFilePreview')}</span>
      </div>

      <DownloadItemComponent onDownload={onDownload} translate={translate} />
    </div>
  );
};
