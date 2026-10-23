import { memo } from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const ARROW_CLASSNAME = 'absolute top-1/2 z-30 rounded-full bg-black p-4 text-white outline-none';

interface FileNavigationArrowsProps {
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}

const FileNavigationArrows = ({
  canGoToPrevious,
  canGoToNext,
  onPrevious,
  onNext,
}: FileNavigationArrowsProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <>
      {canGoToPrevious && (
        <button title={translate('actions.previous')} className={`left-4 ${ARROW_CLASSNAME}`} onClick={onPrevious}>
          <CaretLeftIcon size={24} />
        </button>
      )}
      {canGoToNext && (
        <button title={translate('actions.next')} className={`right-4 ${ARROW_CLASSNAME}`} onClick={onNext}>
          <CaretRightIcon size={24} />
        </button>
      )}
    </>
  );
};

export default memo(FileNavigationArrows);
