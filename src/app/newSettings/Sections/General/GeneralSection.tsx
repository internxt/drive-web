import Appearance from './components/Appearance';
import ContactSupport from './components/ContactSupport';
import Language from './components/Language';
import Section from 'app/newSettings/components/Section';

const GeneralSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  return (
    <Section title="General" className="" onClosePreferences={onClosePreferences}>
      <Appearance />
      <Language />
      <ContactSupport />
    </Section>
  );
};

export default GeneralSection;
