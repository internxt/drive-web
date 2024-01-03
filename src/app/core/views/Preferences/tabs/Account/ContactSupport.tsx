import { useChat } from 'react-live-chat-loader';
import Section from '../../components/Section';
import Card from 'app/shared/components/Card';
import Button from 'app/shared/components/Button/Button';
import { useState } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const ContactSupport = () => {
  const { translate } = useTranslationContext();
  const [state, loadChat] = useChat();

  const onClick = () => {
    loadChat({ open: true });
  };

  return (
    <Section title={translate('views.account.tabs.account.support.title')}>
      <Card>
        <p className="text-gray-80">{translate('views.account.tabs.account.support.description')}</p>
        <Button className="mt-5" variant="secondary" onClick={onClick}>
          {translate('views.account.tabs.account.support.cta')}
        </Button>
      </Card>
    </Section>
  );
};

export default ContactSupport;
