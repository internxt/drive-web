import { House, Lifebuoy, Question } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
export default function NotFound() {
  const { translate } = useTranslationContext();
  const cards = [
    {
      icon: House,
      title: translate('notFound.card1.title'),
      description: translate('notFound.card1.description'),
      urlRedirect: () => navigationService.push(AppView.Drive),
    },
    {
      icon: Question,
      title: translate('notFound.card2.title'),
      description: translate('notFound.card2.description'),
      urlRedirect: () => (window.location.href = 'https://help.internxt.com/en/'),
    },
    {
      icon: Lifebuoy,
      title: translate('notFound.card3.title'),
      description: translate('notFound.card3.description'),
      urlRedirect: () => (window.location.href = 'mailto:hello@internxt.com'),
    },
  ];

  return (
    <section className="px-5 py-20">
      <div className="content flex flex-col items-center justify-center space-y-4 lg:pt-10">
        <div className="flex flex-col rounded-lg bg-gray-5 px-4 py-2">
          <p className="text-xl font-medium text-gray-80">{translate('notFound.header')}</p>
        </div>
        <div className="flex flex-col items-center justify-center space-y-20">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-6xl font-semibold text-gray-100">{translate('notFound.title')}</h1>
            <p className="text-xl text-gray-60">{translate('notFound.description')}</p>
          </div>
          <div className="flex flex-row flex-wrap items-center justify-center gap-10">
            {cards.map((card) => (
              <button
                className="flex h-52 cursor-pointer select-none flex-col items-center justify-start rounded-lg bg-gray-1 px-4 py-8 text-center"
                key={card.title}
                onClick={card.urlRedirect}
              >
                <card.icon size={32} className="mb-5 shrink-0 text-primary" />
                <p className="text-lg font-medium text-gray-100">{card.title}</p>
                <p className="w-50 text-base text-gray-60">{card.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
