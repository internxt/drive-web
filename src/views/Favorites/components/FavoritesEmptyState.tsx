import { StarIcon } from '@phosphor-icons/react';
import { Empty } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const FavoritesEmptyState = (): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <Empty
      icon={<StarIcon className="text-primary" size={64} weight="fill" />}
      title={translate('views.favorites.empty.title')}
      subtitle={translate('views.favorites.empty.description')}
    />
  );
};

export default FavoritesEmptyState;
