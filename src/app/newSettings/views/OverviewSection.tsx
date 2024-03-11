import { t } from 'i18next';
import Section from '../../core/views/Preferences/components/Section';
import Avatar from '../../shared/components/Avatar';
import Button from '../../shared/components/Button/Button';
import Card from '../../shared/components/Card';
import Detail from '../components/Detail';

const OverviewSection = () => {
  // MOCK DATA
  const avatarBlob = null;
  const address =
    'La Marina de Valencia, Muelle de la Aduana s/n, La Marina de Valencia, Muelle de la Aduana s/n, Spain';
  const phone = '+345646654456';
  const owner = 'Nombre Apellido1 Apellido2';
  const companyName = 'Internxt Universal Technologies SL';
  const description =
    'Our goal is to create a cloud storage ecosystem that gives users total control, security, and privacy of the files and information online.';

  return (
    <Section title="Overview" className="flex flex-1 flex-col space-y-6 p-6">
      <UserProfileCard
        description={description}
        avatarBlob={avatarBlob}
        companyName={companyName}
        onEditButtonClick={() => undefined}
      />
      <OverviewDetailsCard address={address} phone={phone} owner={owner} />
    </Section>
  );
};

interface UserProfileCardProps {
  avatarBlob?: Blob | null;
  companyName: string;
  description: string;
  onEditButtonClick: () => void;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  avatarBlob,
  companyName,
  description,
  onEditButtonClick,
}) => {
  return (
    <div className="flex flex-row">
      <div className="flex flex-col justify-center">
        <Avatar diameter={80} fullName={companyName} src={avatarBlob ? URL.createObjectURL(avatarBlob) : null} />
      </div>
      <div className="mx-5 flex grow flex-col space-y-1 py-2">
        <span className="max-w-xs truncate text-lg font-semibold leading-5 text-gray-100">{companyName}</span>
        <span className="line-clamp-3 max-w-xs text-sm font-normal leading-4 text-gray-60">{description}</span>
      </div>
      <div className="flex flex-col justify-center">
        <Button variant="secondary" onClick={onEditButtonClick}>
          <span>Edit</span>
        </Button>
      </div>
    </div>
  );
};

interface OverviewDetailsCardProps {
  address: string;
  phone: string;
  owner: string;
}

const OverviewDetailsCard = ({ address, phone, owner }: OverviewDetailsCardProps) => {
  return (
    <Card>
      <div className="flex flex-row  space-x-10">
        <div style={{ maxWidth: 272 }} className="flex h-full min-w-0 grow flex-col ">
          <Detail label={t('views.preferences.workspace.overview.address')} value={address} />
        </div>

        <div style={{ maxWidth: 272 }} className="flex min-w-0 grow flex-col space-y-2 ">
          <Detail label={t('views.preferences.workspace.overview.phone')} value={phone} />
          <Detail label={t('views.preferences.workspace.overview.owner')} value={owner} />
        </div>
      </div>
    </Card>
  );
};

export default OverviewSection;
