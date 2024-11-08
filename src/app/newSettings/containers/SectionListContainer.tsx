import { useSelector } from 'react-redux';
import navigationService from '../../core/services/navigation.service';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import { RootState } from '../../store';
import workspacesSelectors from '../../store/slices/workspaces/workspaces.selectors';
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
    onlyOwner: true,
  },
  {
    section: 'workspace',
    subsection: 'logs',
    onlyOwner: true,
    isSubsection: true,
    notificationsNumber: 0,
  },
  { section: 'account', isSection: true, notificationsNumber: 0 },
  {
    section: 'account',
    subsection: 'account',
    isSubsection: true,
    notificationsNumber: 0,
  },
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
  const selectedWorkspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const isOwner = useSelector(workspacesSelectors.isWorkspaceOwner);

  const goSection = ({ section, subsection }: { section?: string; subsection?: string }) => {
    if (section && subsection) {
      navigationService.openPreferencesDialog({
        section: section,
        subsection: subsection,
        workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
      });
      changeSection({ section, subsection });
    }
  };

  const filteredSectionItems = sectionItems.filter((sectionItem) => {
    if (sectionItem.section === 'workspace' && !selectedWorkspace) {
      return false;
    }
    if (sectionItem.onlyOwner && !isOwner) {
      return false;
    }

    return true;
  });

  const sectionsItemsWithText = filteredSectionItems.map((sectionItem) => ({
    ...sectionItem,
    text: translate(`preferences.navBarSections.${sectionItem.subsection ?? sectionItem?.section}`),
  }));

  return <SectionList sectionItems={sectionsItemsWithText} activeSection={activeSection} goSection={goSection} />;
};

export default SectionListContainer;
