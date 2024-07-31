import { useState } from 'react';
import { t } from 'i18next';
import Section from 'app/newSettings/components/Section';
import TeamsList from './components/TeamsList';

const TeamsSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);

  return (
    <Section title={t('preferences.workspace.teams.title')} onClosePreferences={onClosePreferences}>
      <TeamsList setCreateTeamDialogOpen={setCreateTeamDialogOpen} />
    </Section>
  );
};

export default TeamsSection;
