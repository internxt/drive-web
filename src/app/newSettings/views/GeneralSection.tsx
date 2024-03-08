import Appearance from '../components/Appearance';
import ContactSupport from '../components/ContactSupport';
import Language from '../components/Language';

const GeneralSection = () => {
  return (
    <div className="flex flex-1 flex-col space-y-8 p-6">
      <Appearance />
      <Language />
      <ContactSupport />
    </div>
  );
};

export default GeneralSection;
