import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { X } from '@phosphor-icons/react';

import navigationService from 'app/core/services/navigation.service';
import Modal from 'app/shared/components/Modal';
import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { SelectSectionProps, PreferencesDialogProps, Sections } from '../types';

const PreferencesDialog = (props: PreferencesDialogProps) => {
  const { haveParamsChanged, isPreferencesDialogOpen } = props;
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const SECTIONS: Sections = [
    { section: 'general', subsection: 'general', title: translate('preferences.general.title') },
    { section: 'workspace', subsection: 'overview', title: translate('preferences.workspace.overview.title') },
    { section: 'workspace', subsection: 'members', title: translate('preferences.workspace.members.title') },
    { section: 'workspace', subsection: 'teams', title: translate('preferences.workspace.teams.title') },
    { section: 'workspace', subsection: 'billing', title: translate('preferences.workspace.billing.title') },
    { section: 'account', subsection: 'plans', title: translate('preferences.account.plans.title') },
    { section: 'account', subsection: 'billing', title: translate('preferences.account.billing.title') },
    { section: 'account', subsection: 'security', title: translate('preferences.account.security.title') },
  ];

  const params = new URLSearchParams(window.location.search);
  const currentSectionParams = params.getAll('section');
  const currentSubsectionParams = params.getAll('subsection');

  const [activeSection, setActiveSection] = useState<Sections>([{ section: '', subsection: '', title: '' }]);

  useEffect(() => {
    if (currentSectionParams.length > 0) {
      const sectionParams = SECTIONS.filter((section) => section.section === currentSectionParams[0]);
      const subsectionParams = sectionParams.filter(
        (subsection) => subsection.subsection === currentSubsectionParams[0],
      );
      changeSection({ section: sectionParams[0].section, subsection: subsectionParams[0].subsection });
    } else {
      dispatch(uiActions.setIsPreferencesDialogOpen(false));
    }
  }, [haveParamsChanged]);

  const changeSection = ({ section: onSection, subsection: OnSubsection }: SelectSectionProps) => {
    const selectedSection = SECTIONS.filter((section) => section.section === onSection);
    const selectedSubsection = selectedSection.filter((subsection) => subsection.subsection === OnSubsection);
    setActiveSection(selectedSubsection);
  };

  const goSection = ({ section, subsection }: SelectSectionProps) => {
    navigationService.openPreferencesDialog({ section: section, subsection: subsection });
    changeSection({ section, subsection });
  };

  const onClose = () => {
    dispatch(uiActions.setIsPreferencesDialogOpen(false));
    navigationService.closePreferencesDialog();
  };

  return (
    <Modal maxWidth="w-full max-w-4xl" className="m-0 flex" isOpen={isPreferencesDialogOpen} onClose={() => onClose()}>
      <Helmet>
        <title>{activeSection[0].title} - Internxt Drive</title>
      </Helmet>

      {/* SIDEBAR MENU */}
      <section className="w-56 border-r border-gray-10 px-2.5">
        <h1 className="py-3 pl-4 text-xl font-semibold">{translate('preferences.title')}</h1>
        <button
          className="py-3 pl-4"
          onClick={() => {
            goSection({ section: 'account', subsection: 'security' });
          }}
        >
          Go Security
        </button>
      </section>
      {/* SIDEBAR MENU */}

      {/* ACTIVE SECTION */}
      <section className="relative w-full">
        <button className="absolute right-0 z-50 m-4 flex w-auto" onClick={() => onClose()}>
          <X size={22} />
        </button>
        <h2>{activeSection[0].title}</h2>
      </section>
      {/* ACTIVE SECTION */}
    </Modal>
  );
};

export default PreferencesDialog;
