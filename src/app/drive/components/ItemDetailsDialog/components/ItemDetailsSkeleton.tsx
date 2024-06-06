import { ItemDetailsProps } from '../../../../drive/types';
import Skeleton from 'react-loading-skeleton';

const ItemDetailsSkeleton = ({
  translate,
  isFolder,
}: {
  translate: (key: string) => string;
  isFolder: boolean | undefined;
}) => {
  const itemData: ItemDetailsProps = {
    name: '',
    shared: '',
    ...(!isFolder && {
      type: '',
      size: '',
    }),
    uploaded: '',
    modified: '',
    uploadedBy: '',
    location: '',
  };

  return (
    <>
      {Object.keys(itemData).map((key) => {
        return (
          <div key={key} className="flex w-full max-w-xxxs flex-col items-start justify-center space-y-0.5">
            <p className="text-sm font-medium text-gray-50">
              {translate(`modals.itemDetailsModal.itemDetails.${key}`)}
            </p>
            <Skeleton width={200} height={20} />
          </div>
        );
      })}
    </>
  );
};

export default ItemDetailsSkeleton;
