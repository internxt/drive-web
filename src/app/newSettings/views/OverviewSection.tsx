import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import errorService from '../../core/services/error.service';
import localStorageService from '../../core/services/local-storage.service';
import Section from '../../core/views/Preferences/components/Section';
import usageService, { UsageDetailsProps } from '../../drive/services/usage.service';
import Avatar from '../../shared/components/Avatar';
import Button from '../../shared/components/Button/Button';
import Card from '../../shared/components/Card';
import Spinner from '../../shared/components/Spinner/Spinner';
import { RootState } from '../../store';
import { PlanState } from '../../store/slices/plan';
import Detail from '../components/Detail';
import UsageDetails from '../containers/UsageContainer';
import { getSubscriptionData } from '../utils/suscriptionUtils';

const OverviewSection = () => {
  // MOCKED DATA
  const avatarBlob = null;
  const address =
    'La Marina de Valencia, Muelle de la Aduana s/n, La Marina de Valencia, Muelle de la Aduana s/n, Spain';
  const phone = '+345646654456';
  const owner = 'Nombre Apellido1 Apellido2';
  const companyName = 'Internxt Universal Technologies SL';
  const description =
    'Our goal is to create a cloud storage ecosystem that gives users total control, security, and privacy of the files and information online.';
  const isOwner = true;
  const members = 32;
  const teams = 4;

  // PROBABLY NEED TO CHANGE WHEN IMPLEMENT API CALLS
  const [planUsage, setPlanUsage] = useState<UsageDetailsProps | null>(null);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  const local = localStorageService.get('i18nextLng') ?? navigator.language.split('-')[0];

  useEffect(() => {
    usageService
      .getUsageDetails()
      .then((usageDetails) => {
        setPlanUsage(usageDetails);
      })
      .catch((err) => {
        const error = errorService.castError(err);
        errorService.reportError(error);
      });
  }, []);

  const products: Parameters<typeof UsageDetails>[0]['products'] | null = planUsage
    ? [
        {
          name: t('sideNav.drive'),
          usageInBytes: planUsage.drive,
          color: 'primary',
        },
        {
          name: t('sideNav.photos'),
          usageInBytes: planUsage.photos,
          color: 'orange',
        },
        {
          name: t('views.account.tabs.account.view.backups'),
          usageInBytes: planUsage.backups,
          color: 'indigo',
        },
      ]
    : null;

  const subscriptionData: { amountInterval: string; interval: 'monthly' | 'yearly'; renewDate: string } | undefined =
    getSubscriptionData({ userSubscription: plan.subscription, plan, local });

  return (
    <Section title="Overview" className="flex flex-1 flex-col space-y-6 p-6">
      <UserProfileCard
        description={description}
        avatarBlob={avatarBlob}
        companyName={companyName}
        onEditButtonClick={() => undefined}
        isOwner={isOwner}
      />
      {isOwner && <OverviewDetailsCard address={address} phone={phone} owner={owner} />}
      <WorkspaceOverviewDetails
        members={members}
        teams={teams}
        planLimit={plan.planLimit}
        products={products}
        isOwner={isOwner}
        subscriptionData={subscriptionData}
        onMembersCardClick={() => undefined}
        onTeamsCardClick={() => undefined}
        onBillingCardClick={() => undefined}
      />
    </Section>
  );
};

interface WorkspaceOverviewDetailsProps {
  members: number;
  teams: number;
  planLimit: number;
  products: Parameters<typeof UsageDetails>[0]['products'] | null;
  isOwner: boolean;
  subscriptionData: { amountInterval?: string; interval?: 'monthly' | 'yearly'; renewDate?: string } | undefined;
  onMembersCardClick: () => void;
  onTeamsCardClick: () => void;
  onBillingCardClick: () => void;
}

const WorkspaceOverviewDetails = ({
  members,
  teams,
  planLimit,
  products,
  isOwner,
  subscriptionData,
  onMembersCardClick,
  onTeamsCardClick,
  onBillingCardClick,
}: WorkspaceOverviewDetailsProps) => {
  const twoCardsClass = isOwner ? 'grow' : 'grow w-full';
  const [integerPart, decimalPart] = subscriptionData?.amountInterval?.split('.') ?? [];

  return (
    <div className="space-y-6">
      {isOwner && (
        <span className="text-xl font-medium">{t('views.preferences.workspace.overview.workspaceOverview')}</span>
      )}
      <div className="flex flex-row space-x-6">
        <button className={`${twoCardsClass} text-left`} onClick={onMembersCardClick}>
          <Card className={twoCardsClass}>
            <p className="text-3xl font-medium leading-9 text-gray-100">{members}</p>
            <h1 className="text-base font-normal leading-5">{t('views.preferences.workspace.overview.members')}</h1>
          </Card>
        </button>
        <button className={`${twoCardsClass} text-left`} onClick={onTeamsCardClick}>
          <Card className={twoCardsClass}>
            <p className="text-3xl font-medium leading-9 text-gray-100">{teams}</p>
            <h1 className="text-base font-normal leading-5">{t('views.preferences.workspace.overview.teams')}</h1>
          </Card>
        </button>
        {isOwner && (
          <button className="grow text-left" onClick={onBillingCardClick}>
            <Card className="grow">
              <p className="text-3xl font-medium leading-9 text-gray-100">
                {integerPart}
                <span className="text-xl font-medium">.{decimalPart}</span>
              </p>
              <h1 className="text-base font-normal leading-5">
                {t('views.preferences.workspace.overview.billed', {
                  renewDate: subscriptionData?.renewDate,
                })}
              </h1>
            </Card>
          </button>
        )}
      </div>
      <div className="flex flex-row">
        <Card className="flex grow">
          {products && planLimit ? (
            <UsageDetails planLimitInBytes={planLimit} products={products} />
          ) : (
            <div className="flex h-36 w-full items-center justify-center">
              <Spinner className="h-7 w-7 text-primary" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

interface UserProfileCardProps {
  avatarBlob?: Blob | null;
  companyName: string;
  description: string;
  onEditButtonClick: () => void;
  isOwner: boolean;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  avatarBlob,
  companyName,
  description,
  onEditButtonClick,
  isOwner,
}) => {
  const containerClass = isOwner ? 'flex flex-row' : 'flex flex-col w-full justify-center items-center space-y-5';

  return (
    <div className={containerClass}>
      <div className="flex flex-col justify-center">
        <Avatar diameter={80} fullName={companyName} src={avatarBlob ? URL.createObjectURL(avatarBlob) : null} />
      </div>
      <div className={`mx-5 flex grow flex-col space-y-1 ${isOwner && 'py-2'}`}>
        <span className={`font-semiboldleading-5 max-w-xs truncate text-lg text-gray-100 ${!isOwner && 'text-center'}`}>
          {companyName}
        </span>
        <span
          className={`line-clamp-3 max-w-xs text-sm font-normal leading-4 text-gray-60 ${!isOwner && 'text-center'}`}
        >
          {description}
        </span>
      </div>
      {isOwner && (
        <div className="flex flex-col justify-center">
          <Button variant="secondary" onClick={onEditButtonClick}>
            <span>{t('views.preferences.workspace.overview.edit')}</span>
          </Button>
        </div>
      )}
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
        <div className="flex h-full w-full min-w-0 grow flex-col ">
          <Detail label={t('views.preferences.workspace.overview.address')} value={address} />
        </div>

        <div className="flex w-full min-w-0 grow flex-col space-y-2 ">
          <Detail label={t('views.preferences.workspace.overview.phone')} value={phone} />
          <Detail label={t('views.preferences.workspace.overview.owner')} value={owner} />
        </div>
      </div>
    </Card>
  );
};

export default OverviewSection;
