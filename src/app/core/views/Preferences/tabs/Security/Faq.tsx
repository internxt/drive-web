import { Disclosure } from '@headlessui/react';
import { CaretUp } from 'phosphor-react';
import Section from '../../components/Section';

export default function Faq({ className = '' }: { className?: string }): JSX.Element {
  const questions: { title: string; body: string }[] = [
    {
      title: 'Why do I lose all my files if I lose my password?',
      body: 'Your password is the only way to access your account, the Internxt team cannot access your account on change your password. This is to prevent anyone from accessing your account or steal your information. <br/><br/>Among other things your password is used to encrypt your encryption key so not even the Internxt has access to it. Every time you log in you need your password to decrypt this encryption key that way we ensure you are the only one holding the encryption keys.',
    },
    {
      title: 'How can I keep safe my credentials?',
      body: 'We recommend to use a password manager to store your credentials safely not just for accessing the Internxt platform but to keep yourself safe and productive while browsing.',
    },
    {
      title: 'Can I recover my account with the backup key?',
      body: 'If you keep somewhere safe your encryption key, recover your data following the steps outlined in the email you will receive when clicking “forgot password”.',
    },
    {
      title: 'Do I lose all my files if I change my password?',
      body: 'No, since you are already logged in you can change your password without losing anything. Make sure you have chosen a strong password and it is not found in any data breach.',
    },
  ];

  return (
    <Section className={className} title="Did you miss anything?">
      {questions.map((question, i) => (
        <Disclosure defaultOpen={i === 0} key={i}>
          {({ open }) => (
            <div className={`flex flex-col ${open && 'bg-gray-5 mb-2 pb-6'} rounded-xl transition-all duration-150 ease-in-out`}>
              <Disclosure.Button
                className={`flex w-full justify-between text-left px-6 py-3 font-medium text-gray-60 transition-all duration-150 ease-in-out ${
                  open && 'text-gray-80 pt-6'
                }`}
              >
                <p>{question.title}</p>
                <CaretUp
                  className={`ml-4 mt-0.5 flex-shrink-0 text-gray-40 ${open ? '' : 'transform rotate-180'} transition-transform duration-200 ease-in-out`}
                  weight="bold"
                  size={20}
                />
              </Disclosure.Button>
              {open && (
                <Disclosure.Panel
                  className="text-sm text-gray-60 px-6 pt-0 transition-all duration-150 ease-in-out"
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
