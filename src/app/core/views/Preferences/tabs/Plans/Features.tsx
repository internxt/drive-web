import { ArrowsClockwise, Check, LockKey, Shield } from 'phosphor-react';
import { useTranslation } from 'react-i18next';

export default function Features({ className = '' }: { className?: string }): JSX.Element {
  const { t } = useTranslation();
  const sections: { title: string; icon: typeof Shield; points: string[] }[] = [
    {
      title: t('views.account.tabs.plans.features.sections.section1.title'),
      icon: Shield,
      points: [
        t('views.account.tabs.plans.features.sections.section1.point1'),
        t('views.account.tabs.plans.features.sections.section1.point2'),
        t('views.account.tabs.plans.features.sections.section1.point3'),
      ],
    },
    {
      title: t('views.account.tabs.plans.features.sections.section2.title'),
      icon: LockKey,
      points: [
        t('views.account.tabs.plans.features.sections.section2.point1'),
        t('views.account.tabs.plans.features.sections.section2.point2'),
        t('views.account.tabs.plans.features.sections.section2.point3'),
      ],
    },
    {
      title: t('views.account.tabs.plans.features.sections.section3.title'),
      icon: ArrowsClockwise,
      points: [
        t('views.account.tabs.plans.features.sections.section3.point1'),
        t('views.account.tabs.plans.features.sections.section3.point2'),
        t('views.account.tabs.plans.features.sections.section3.point3'),
      ],
    },
  ];
  return (
    <div className={`${className}`}>
      <h1 className="text-2xl font-medium text-gray-100 lg:text-center">
        {t('views.account.tabs.plans.features.title')}
      </h1>
      <div className="mt-7 justify-between space-y-6 lg:flex lg:space-y-0 lg:space-x-6">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-1 flex-col">
            <div className="flex items-center">
              <section.icon size={24} weight="duotone" className="text-primary" />
              <h1 className="ml-2 flex-1 text-lg font-medium text-gray-80">{section.title}</h1>
            </div>
            <div className="mt-3 space-y-2 pl-2">
              {section.points.map((point) => (
                <div key={point} className="flex flex-row">
                  <Check size={16} weight="bold" className="mt-1 text-gray-40" />
                  <p className="ml-2 flex-1 text-gray-80">{point}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
