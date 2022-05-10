import { Disclosure } from '@headlessui/react';
import { CaretUp } from 'phosphor-react';
import Section from '../../components/Section';

export default function Faq({ className = '' }: { className?: string }): JSX.Element {
  const questions: { title: string; body: string }[] = [
    {
      title: 'Why I lose all my files if I lose my password?',
      body: 'Your password is the only way to access your account, even the Internxt team cannot access your account or change your password. This is to prevent anyone from accessing your account or steal your information.<br/> <br/> All your files, photos and videos are encrypted, that way only you, with your password, can access them.',
    },
    {
      title: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. ',
      body: 'Lorem ipsum, dolor sit amet consectetur adipisicing elit. Mollitia voluptates animi illo enim accusamus, odit dolor dolorem ea nam vitae ab, laborum nemo deleniti, nihil voluptas numquam asperiores officiis modi.',
    },
  ];

  return (
    <Section className={className} title="Did you miss anything?">
      {questions.map((question, i) => (
        <Disclosure defaultOpen={i === 0}>
          {({ open }) => (
            <>
              <Disclosure.Button
                className={`flex w-full justify-between px-5 text-left ${
                  open ? ' rounded-t-lg bg-gray-5 pt-5 font-medium text-gray-80' : 'py-3 text-gray-60'
                }`}
              >
                <p>{question.title}</p>
                <CaretUp
                  className={`ml-4 mt-0.5 flex-shrink-0 text-gray-40 ${open ? '' : 'rotate-180 transform'}`}
                  weight="bold"
                  size={20}
                />
              </Disclosure.Button>
              <Disclosure.Panel
                className="rounded-b-lg bg-gray-5 px-5 pt-2 pb-5 text-sm text-gray-60"
                dangerouslySetInnerHTML={{ __html: question.body }}
              />
            </>
          )}
        </Disclosure>
      ))}
    </Section>
  );
}
