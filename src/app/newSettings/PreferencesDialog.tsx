import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import navigationService from 'app/core/services/navigation.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Modal from 'app/shared/components/Modal';
import AccountSection from './Sections/Account/Account/AccountSection';
import BillingAccountSection from './Sections/Account/Billing/BillingAccountSection';
import PlansSection from './Sections/Account/Plans/PlansSection';
import SecuritySection from './Sections/Account/Security/SecuritySection';
import GeneralSection from './Sections/General/GeneralSection';
import BillingWorkspaceSection from './Sections/Workspace/Billing/BillingWorkspaceSection';
import MembersSection from './Sections/Workspace/Members/MembersSection';
import OverviewSection from './Sections/Workspace/Overview/OverviewSection';
import SectionListContainer, { sectionItems } from './containers/SectionListContainer';
import { PreferencesDialogProps, Section, SelectSectionProps } from './types/types';

const findSectionItemsBySectionAndSubsection = ({ section, subsection }: SelectSectionProps) => {
  return sectionItems.find((item) => item.section === section && item.subsection === subsection);
};

const PreferencesDialog = (props: PreferencesDialogProps) => {
  const { haveParamsChanged, isPreferencesDialogOpen } = props;
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  // const isToastNotificationOpen = useAppSelector((state: RootState) => state.ui.isToastNotificationOpen);

  const params = new URLSearchParams(window.location.search);
  const currentSectionParams = params.getAll('section');
  const currentSubsectionParams = params.getAll('subsection');
  const [activeSection, setActiveSection] = useState<Section | undefined>({
    section: 'General',
    subsection: 'General',
  });
  const title = translate(`preferences.navBarSections.${activeSection?.subsection ?? activeSection?.section}`) ?? '';

  useEffect(() => {
    if (currentSectionParams.length > 0) {
      const sectionParams = sectionItems.filter((section) => section.section === currentSectionParams[0]);
      const subsectionParams = sectionParams.filter(
        (subsection) => subsection.subsection === currentSubsectionParams[0],
      );
      changeSection({ section: sectionParams[0]?.section, subsection: subsectionParams[0]?.subsection });
    } else {
      dispatch(uiActions.setIsPreferencesDialogOpen(false));
    }
  }, [haveParamsChanged, isPreferencesDialogOpen]);

  const changeSection = ({ section, subsection }: SelectSectionProps) => {
    const selectedNavSection = findSectionItemsBySectionAndSubsection({ section, subsection });
    setActiveSection(selectedNavSection);
  };

  const onClosePreferences = () => {
    dispatch(uiActions.setIsPreferencesDialogOpen(false));
    navigationService.closePreferencesDialog();
  };

  return (
    <Modal
      maxWidth="max-w-4xl"
      className="m-0 flex h-640 overflow-hidden shadow-sm"
      isOpen={isPreferencesDialogOpen}
      onClose={() => onClosePreferences()}
      // preventClosing={isToastNotificationOpen}
    >
      <Helmet>
        <title>{title} - Internxt Drive</title>
      </Helmet>
      {/* SIDEBAR MENU */}
      <section className="w-56 shrink-0 border-r border-gray-10 px-2.5">
        <h1 className="py-3 pl-4 text-xl font-semibold">{translate('preferences.title')}</h1>
        <SectionListContainer activeSection={activeSection} changeSection={changeSection} />
      </section>
      {/* SIDEBAR MENU */}
      <section className="w-full">
        {activeSection?.section === 'general' && activeSection?.subsection === 'general' && (
          <GeneralSection onClosePreferences={() => onClosePreferences()} />
        )}
        {activeSection?.section === 'workspace' && activeSection?.subsection === 'overview' && (
          <OverviewSection onClosePreferences={() => onClosePreferences()} />
        )}
        {activeSection?.section === 'workspace' && activeSection?.subsection === 'members' && (
          <MembersSection onClosePreferences={() => onClosePreferences()} />
        )}
        {activeSection?.section === 'workspace' && activeSection?.subsection === 'billing' && (
          <BillingWorkspaceSection onClosePreferences={() => onClosePreferences()} />
        )}
        {activeSection?.section === 'account' && activeSection?.subsection === 'account' && (
          <AccountSection changeSection={changeSection} onClosePreferences={() => onClosePreferences()} />
        )}
        {activeSection?.section === 'account' && activeSection?.subsection === 'plans' && (
          <PlansSection changeSection={changeSection} onClosePreferences={() => onClosePreferences()} />
        )}
        {activeSection?.section === 'account' && activeSection?.subsection === 'billing' && (
          <BillingAccountSection changeSection={changeSection} onClosePreferences={() => onClosePreferences()} />
        )}
        {activeSection?.section === 'account' && activeSection?.subsection === 'security' && (
          <SecuritySection onClosePreferences={() => onClosePreferences()} />
        )}
      </section>
      {/* ACTIVE SECTION */}
    </Modal>
  );
};

export default PreferencesDialog;
