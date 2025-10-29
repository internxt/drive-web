import { useChat } from 'react-live-chat-loader';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import Section from './Section';
import { Button } from '@internxt/ui';

const ContactSupport = () => {
  const { translate } = useTranslationContext();
  const [, loadChat] = useChat();

  const onClick = () => {
    loadChat({ open: true });
  };

  return (
    <Section title={translate('views.account.tabs.account.support.title')}>
      <p className="text-gray-80">{translate('views.account.tabs.account.support.description')}</p>
      <Button className="mt-5" variant="secondary" onClick={onClick}>
        {translate('views.account.tabs.account.support.cta')}
      </Button>
    </Section>
  );
};

export default ContactSupport;
