import navigationService from '../../core/services/navigation.service';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import SectionList from '../components/SectionList';

export interface NavSection {
  section?: string;
  subsection?: string;
  text: string;
  isSubsection?: boolean;
  notificationsNumber: number;
}

export const sectionItems = [
  {
    section: 'general',
    subsection: 'general',
    notificationsNumber: 0,
  },
  { section: 'workspace', isSection: true, notificationsNumber: 0 },
  {
    section: 'workspace',
    subsection: 'overview',
    isSubsection: true,
    notificationsNumber: 0,
  },
  {
    section: 'workspace',
    subsection: 'members',

    isDisabled: false,
    isSubsection: true,
    notificationsNumber: 0,
  },
  {
    section: 'workspace',
    subsection: 'teams',
    isDisabled: false,
    isSubsection: true,
    notificationsNumber: 0,
  },
  {
    section: 'workspace',
    subsection: 'billing',
    isSubsection: true,
    notificationsNumber: 0,
  },
  { section: 'account', isSection: true, notificationsNumber: 0 },
  {
    section: 'account',
    subsection: 'plans',
    isSubsection: true,
    notificationsNumber: 0,
  },
  {
    section: 'account',
    subsection: 'billing',
    isSubsection: true,
    notificationsNumber: 0,
  },
  {
    section: 'account',
    subsection: 'security',
    isSubsection: true,
    notificationsNumber: 0,
  },
];

const SectionListContainer = ({ activeSection, changeSection }) => {
  const { translate } = useTranslationContext();

  const goSection = ({ section, subsection }: { section?: string; subsection?: string }) => {
    if (section && subsection) {
      navigationService.openPreferencesDialog({ section: section, subsection: subsection });
      changeSection({ section, subsection });
    }
  };

  const sectionsItemsWithText = sectionItems.map((sectionItem) => ({
    ...sectionItem,
    text: translate(`preferences.navBarSections.${sectionItem.subsection ?? sectionItem?.section}`),
  }));

  return <SectionList sectionItems={sectionsItemsWithText} activeSection={activeSection} goSection={goSection} />;
};

export default SectionListContainer;
