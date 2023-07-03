import { Disclosure } from '@headlessui/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { CaretUp } from '@phosphor-icons/react';
import Section from '../../components/Section';

export default function Faq({ className = '' }: { className?: string }): JSX.Element {
  const { translate } = useTranslationContext();

  const questions: { title: string; body: string }[] = [
    {
      title: translate('views.account.tabs.security.faq.faq1.title'),
      body: translate('views.account.tabs.security.faq.faq1.description'),
    },
    {
      title: translate('views.account.tabs.security.faq.faq2.title'),
      body: translate('views.account.tabs.security.faq.faq2.description'),
    },
    {
      title: translate('views.account.tabs.security.faq.faq3.title'),
      body: translate('views.account.tabs.security.faq.faq3.description'),
    },
    {
      title: translate('views.account.tabs.security.faq.faq4.title'),
      body: translate('views.account.tabs.security.faq.faq4.description'),
    },
  ];

  return (
    <Section className={className} title={translate('views.account.tabs.security.faq.title')}>
      {questions.map((question, i) => (
        <Disclosure defaultOpen={i === 0} key={i}>
          {({ open }) => (
            <div
              className={`flex flex-col ${
                open && 'mb-2 bg-gray-5 pb-6'
              } rounded-xl transition-all duration-150 ease-in-out`}
            >
              <Disclosure.Button
                className={`flex w-full justify-between px-6 py-3 text-left font-medium text-gray-60 transition-all duration-150 ease-in-out ${
                  open && 'pt-6 text-gray-80'
                }`}
              >
                <p>{question.title}</p>
                <CaretUp
                  className={`ml-4 mt-0.5 flex-shrink-0 text-gray-40 ${
                    open ? '' : 'rotate-180 transform'
                  } transition-transform duration-200 ease-in-out`}
                  weight="bold"
                  size={20}
                />
              </Disclosure.Button>
              {open && (
                <Disclosure.Panel
                  className="px-6 pt-0 text-sm text-gray-60 transition-all duration-150 ease-in-out"
                  dangerouslySetInnerHTML={{ __html: question.body }}
                />
              )}
            </div>
          )}
        </Disclosure>
      ))}
    </Section>
  );
}
