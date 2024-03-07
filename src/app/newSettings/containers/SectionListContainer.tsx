import SectionList from '../components/SectionList';

// MOCK DATA
const sectionItemsData = [
  { text: 'General', notificationsNumber: 2, onClick: () => undefined },
  { text: 'Workspace', isSection: true, notificationsNumber: 0 },
  { text: 'Overview', isActive: false, isSubsection: true, notificationsNumber: 0, onClick: () => undefined },
  {
    text: 'Members',
    isActive: false,
    isDisabled: true,
    isSubsection: true,
    notificationsNumber: 0,
    onClick: () => undefined,
  },
  {
    text: 'Teams',
    isActive: false,
    isDisabled: true,
    isSubsection: true,
    notificationsNumber: 0,
    onClick: () => undefined,
  },
  { text: 'Billing', isActive: false, isSubsection: true, notificationsNumber: 0, onClick: () => undefined },
  { text: 'Account', isSection: true, notificationsNumber: 0 },
  { text: 'Plans', isActive: false, isSubsection: true, notificationsNumber: 0, onClick: () => undefined },
  { text: 'Billing', isActive: false, isSubsection: true, notificationsNumber: 0, onClick: () => undefined },
  { text: 'Security', isActive: false, isSubsection: true, notificationsNumber: 0, onClick: () => undefined },
];

const SectionListContainer = () => {
  return <SectionList sectionItems={sectionItemsData} />;
};

export default SectionListContainer;
