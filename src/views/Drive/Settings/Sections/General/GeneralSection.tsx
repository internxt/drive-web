import Appearance from './components/ThemeSwitcher';
import ContactSupport from './components/ContactSupport';
import Language from './components/LanguageOptions';
import Section from '../../../../../views/Drive/Settings/components/Section';

const GeneralSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  return (
    <Section className="max-w-[672px]" title="General" onClosePreferences={onClosePreferences}>
      <Appearance />
      <Language />
      <ContactSupport />
    </Section>
  );
};

export default GeneralSection;
