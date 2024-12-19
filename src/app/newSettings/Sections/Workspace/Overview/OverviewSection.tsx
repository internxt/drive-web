import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { WorkspaceTeam, WorkspaceUser } from '@internxt/sdk/dist/workspaces';
import { PencilSimple } from '@phosphor-icons/react';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import errorService from '../../../../core/services/error.service';
import localStorageService from '../../../../core/services/local-storage.service';
import workspacesService from '../../../../core/services/workspace.service';
import { UsageDetailsProps } from '../../../../drive/services/usage.service';
import Section from '../../../../newSettings/components/Section';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import { Button, Dropdown, Loader } from '@internxt/ui';
import Card from '../../../../shared/components/Card';
import Modal from '../../../../shared/components/Modal';
import { RootState } from '../../../../store';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { PlanState } from '../../../../store/slices/plan';
import { workspaceThunks, workspacesActions } from '../../../../store/slices/workspaces/workspacesStore';
import DetailsInput from '../../../components/DetailsInput';
import UsageContainer from '../../../containers/UsageContainer';
import { getProductCaptions } from '../../../utils/productUtils';
import { getSubscriptionData } from '../../../utils/suscriptionUtils';
import UploadAvatarModal from '../../Account/Account/components/UploadAvatarModal';
import WorkspaceAvatarWrapper from './components/WorkspaceAvatarWrapper';

const MIN_NAME_LENGTH = 3;

interface OverviewSectionProps {
  onClosePreferences: () => void;
  changeSection: ({ section, subsection }) => void;
}

const OverviewSection = ({ onClosePreferences, changeSection }: OverviewSectionProps) => {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useAppSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const currentUserId = useAppSelector((state: RootState) => state.user.user?.uuid);

  if (!selectedWorkspace?.workspace.id) {
    return null;
  }

  const workspaceId = selectedWorkspace.workspace.id;
  const companyName = selectedWorkspace.workspace.name;
  const description = selectedWorkspace.workspace.description;
  const avatarSrcURL = selectedWorkspace.workspace.avatar;
  const ownerId = selectedWorkspace.workspace.ownerId;
  const isOwner = (currentUserId && ownerId && currentUserId === ownerId) || false;

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedCompanyName, setEditedCompanyName] = useState(companyName);
  const [aboutCompany, setAboutCompany] = useState(description);
  const [isSavingProfileDetails, setIsSavingProfileDetails] = useState(false);
  const [members, setMembers] = useState<WorkspaceUser[] | null>(null);
  const [teams, setTeams] = useState<WorkspaceTeam[] | null>(null);

  // PROBABLY NEED TO CHANGE WHEN IMPLEMENT API CALLS
  const [planUsage, setPlanUsage] = useState<UsageDetailsProps | null>(null);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  const local = localStorageService.get('i18nextLng') ?? navigator.language.split('-')[0];
  const products = planUsage ? getProductCaptions(planUsage) : null;
  const subscriptionData: { amountInterval: string; interval: 'monthly' | 'yearly'; renewDate: string } | undefined =
    getSubscriptionData({ userSubscription: plan.businessSubscription, plan, local, userType: UserType.Business });

  useEffect(() => {
    if (selectedWorkspace?.workspace.id) {
      const workspaceId = selectedWorkspace?.workspace.id;
      const memberId = selectedWorkspace?.workspaceUser.memberId;

      getWorkspacesMembers(workspaceId);
      getWorkspacesTeams(workspaceId);

      workspacesService
        .getMemberDetails(workspaceId, memberId)
        .then((data) => {
          const usageDetails: UsageDetailsProps = {
            drive: Number(data.user.driveUsage) || 0,
            backups: Number(data.user.backupsUsage) || 0,
            photos: 0,
          };

          setPlanUsage(usageDetails);
        })
        .catch((err) => {
          const error = errorService.castError(err);
          errorService.reportError(error);
        });
    }
  }, []);

  const getWorkspacesMembers = async (selectedWorkspaceId: string) => {
    try {
      const members = await workspacesService.getWorkspacesMembers(selectedWorkspaceId);
      setMembers(members.activatedUsers);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const getWorkspacesTeams = async (selectedWorkspaceId: string) => {
    try {
      const teams = await workspacesService.getWorkspaceTeams(selectedWorkspaceId);
      setTeams(teams);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const onSaveProfileDetails = async (newCompanyName: string, newAboutCompany: string) => {
    setIsSavingProfileDetails(true);
    if (newCompanyName.length < MIN_NAME_LENGTH) {
      notificationsService.show({
        type: ToastType.Error,
        text: t('views.preferences.workspace.overview.errors.minNameLength'),
      });
      setIsSavingProfileDetails(false);
      return;
    }
    try {
      await workspacesService.editWorkspace(workspaceId, {
        name: newCompanyName,
        description: newAboutCompany,
      });
      setEditedCompanyName(newCompanyName);
      setAboutCompany(newAboutCompany);
      dispatch(
        workspacesActions.patchWorkspace({
          workspaceId,
          patch: {
            name: newCompanyName,
            description: newAboutCompany,
          },
        }),
      );
    } catch (error) {
      errorService.reportError(error);
      const castedError = errorService.castError(error);
      notificationsService.show({ type: ToastType.Error, text: castedError.message });
    } finally {
      setIsEditingDetails(false);
      setIsSavingProfileDetails(false);
    }
  };

  const uploadAvatar = async ({ avatar }: { avatar: Blob }) => {
    try {
      await dispatch(
        workspaceThunks.updateWorkspaceAvatar({
          workspaceId,
          avatar,
        }),
      ).unwrap();
      notificationsService.show({ type: ToastType.Success, text: t('views.account.avatar.success') });
    } catch (err) {
      errorService.reportError(err);
      notificationsService.show({ type: ToastType.Error, text: t('views.account.avatar.error') });
    }
  };

  const deleteAvatar = async () => {
    if (workspaceId) {
      await dispatch(workspaceThunks.deleteWorkspaceAvatar({ workspaceId })).unwrap();
      notificationsService.show({ type: ToastType.Success, text: t('views.account.avatar.removed') });
    } else {
      errorService.reportError(new Error('Tried to delete workspace avatar without id'));
    }
  };

  return (
    <Section title="Overview" onClosePreferences={onClosePreferences}>
      <WorkspaceProfileCard
        workspaceId={workspaceId}
        companyName={editedCompanyName}
        description={aboutCompany}
        avatarSrcURL={avatarSrcURL}
        onEditButtonClick={() => setIsEditingDetails(true)}
        isOwner={isOwner}
        onUploadAvatarClicked={uploadAvatar}
        onDeleteAvatarClicked={deleteAvatar}
      />
      <WorkspaceOverviewDetails
        members={members?.length || 0}
        teams={teams?.length || 0}
        planLimit={plan.businessPlanLimit}
        products={products}
        isOwner={isOwner}
        subscriptionData={subscriptionData}
        onMembersCardClick={() => changeSection({ section: 'workspace', subsection: 'members' })}
        onTeamsCardClick={() => changeSection({ section: 'workspace', subsection: 'teams' })}
        onBillingCardClick={() => changeSection({ section: 'workspace', subsection: 'billing' })}
      />
      <EditWorkspaceDetailsModal
        isOpen={isEditingDetails}
        onClose={() => setIsEditingDetails(false)}
        companyName={editedCompanyName}
        aboutText={aboutCompany}
        onSave={onSaveProfileDetails}
        isLoading={isSavingProfileDetails}
      />
    </Section>
  );
};

const EditWorkspaceDetailsModal = ({
  isOpen,
  onClose,
  companyName,
  aboutText,
  onSave,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  aboutText: string;
  onSave: (editedCompanyName: string, editedAbout: string) => void;
  isLoading: boolean;
}) => {
  const MAX_NAME_LENGHT = 50;
  const MAX_ABOUT_NAME = 150;
  const [editedCompanyName, setEditedCompanyName] = useState(companyName);
  const [aboutCompany, setAboutCompany] = useState(aboutText);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col space-y-5">
        <h1 className=" text-2xl font-medium leading-7">
          {t('views.preferences.workspace.overview.editOverviewDetails.title')}
        </h1>
        <div className="flex grow flex-col space-y-4">
          <DetailsInput
            label="Name"
            textValue={editedCompanyName}
            onChangeTextValue={setEditedCompanyName}
            maxLength={MAX_NAME_LENGHT}
            disabled={isLoading}
          />
          <div>
            <textarea
              placeholder={aboutCompany}
              value={aboutCompany}
              onChange={(e) => setAboutCompany(String(e.target.value))}
              rows={3}
              disabled={isLoading}
              className="w-full resize-none rounded-md border border-gray-20 bg-transparent p-3 pl-4 text-lg font-normal text-gray-80 disabled:text-gray-40 disabled:placeholder-gray-20"
              maxLength={MAX_ABOUT_NAME}
            />
            <span className="flex w-full justify-end text-sm font-normal leading-4 text-gray-50">
              <text>
                {aboutCompany.length}/{MAX_ABOUT_NAME}
              </text>
            </span>
          </div>
        </div>

        <div className="flex w-full flex-row justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {t('views.preferences.workspace.overview.editOverviewDetails.cancelButton')}
          </Button>
          <Button loading={isLoading} variant="primary" onClick={() => onSave(editedCompanyName, aboutCompany)}>
            {t('views.preferences.workspace.overview.editOverviewDetails.saveButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface WorkspaceOverviewDetailsProps {
  members: number;
  teams: number;
  planLimit: number;
  products: Parameters<typeof UsageContainer>[0]['products'] | null;
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
    <div className="space-y-3">
      {isOwner && (
        <span className="text-xl font-medium">{t('views.preferences.workspace.overview.workspaceOverview')}</span>
      )}

      <div className="space-y-6">
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
          {isOwner && subscriptionData && (
            <button className="grow text-left" onClick={onBillingCardClick}>
              <Card className="grow">
                <>
                  <p className="text-3xl font-medium leading-9 text-gray-100">
                    {integerPart}
                    <span className="text-xl font-medium">{decimalPart && `.${decimalPart}`}</span>
                  </p>
                  <h1 className="text-base font-normal leading-5">
                    {t('views.preferences.workspace.overview.billed', {
                      renewDate: subscriptionData?.renewDate,
                    })}
                  </h1>
                </>
              </Card>
            </button>
          )}
        </div>
        <div className="flex flex-row">
          <Card className="flex grow">
            {products && planLimit ? (
              <UsageContainer planLimitInBytes={planLimit} products={products} />
            ) : (
              <div className="flex h-36 w-full items-center justify-center">
                <Loader classNameLoader="h-7 w-7 text-primary" />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

interface WorkspaceProfileCardProps {
  workspaceId: string;
  avatarSrcURL: string | null;
  companyName: string;
  description: string;
  isOwner: boolean;
  onEditButtonClick: () => void;
  onUploadAvatarClicked: ({ avatar }: { avatar: Blob }) => Promise<void>;
  onDeleteAvatarClicked: () => void;
}

const WorkspaceProfileCard: React.FC<WorkspaceProfileCardProps> = ({
  workspaceId,
  avatarSrcURL,
  companyName,
  description,
  isOwner,
  onEditButtonClick,
  onUploadAvatarClicked,
  onDeleteAvatarClicked,
}) => {
  const [openEditAvatarModal, setOpenEditAvatarModal] = useState(false);
  const dropdownOptions = [
    { text: t('views.account.avatar.updatePhoto'), onClick: () => setOpenEditAvatarModal(true) },
  ];

  if (avatarSrcURL) {
    dropdownOptions.push({ text: t('views.account.avatar.removePhoto'), onClick: onDeleteAvatarClicked });
  }

  return (
    <div className="flex w-full flex-col items-center justify-center space-y-4">
      <div className="flex flex-col justify-center">
        {isOwner ? (
          <>
            <Dropdown
              options={isOwner ? dropdownOptions : undefined}
              classMenuItems={'-left-6 mt-1 w-max rounded-md border border-gray-10 bg-surface dark:bg-gray-5'}
              openDirection={'right'}
            >
              <div className="relative">
                <WorkspaceAvatarWrapper
                  diameter={128}
                  workspaceId={workspaceId}
                  fullName={companyName}
                  avatarSrcURL={avatarSrcURL}
                />
                {
                  <div className="absolute -bottom-1.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-3 border-surface bg-gray-5 text-gray-60 dark:bg-gray-10">
                    <PencilSimple size={16} />
                  </div>
                }
              </div>
            </Dropdown>
            <UploadAvatarModal
              isOpen={openEditAvatarModal}
              onClose={() => setOpenEditAvatarModal(false)}
              onUploadAvatarClicked={onUploadAvatarClicked}
              displayFileLimitMessage={() =>
                notificationsService.show({ type: ToastType.Error, text: t('views.account.avatar.underLimitSize') })
              }
              onSavingAvatarError={errorService.reportError}
            />
          </>
        ) : (
          <WorkspaceAvatarWrapper
            diameter={128}
            workspaceId={workspaceId}
            fullName={companyName}
            avatarSrcURL={avatarSrcURL}
          />
        )}
      </div>

      <div className={'mx-5 flex grow flex-col'}>
        <span className={'max-w-xs truncate text-center text-lg font-semibold leading-5 text-gray-100'}>
          {companyName}
        </span>
        <span className={'line-clamp-3 max-w-xs text-center text-sm font-normal leading-4 text-gray-60'}>
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

export default OverviewSection;
