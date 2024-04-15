import { DotsThreeVertical } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import errorService from '../../../../core/services/error.service';
import usageService, { UsageDetailsProps } from '../../../../drive/services/usage.service';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import Card from '../../../../shared/components/Card';
import Spinner from '../../../../shared/components/Spinner/Spinner';
import UsageDetails from '../../../../shared/components/UsageDetails';
import { RootState } from '../../../../store';
import { useAppSelector } from '../../../../store/hooks';
import { PlanState } from '../../../../store/slices/plan';
import UsageBar from '../../../components/Usage/UsageBar';
import { Member } from '../../../types';
import DeactivateMemberModal from '../Components/DeactivateModal';
import RequestPasswordChangeModal from '../Components/RequestPasswordModal';
import UserCard from '../Components/UserCard';

interface MemberDetailsContainer {
  member: Member;
}
const MemberDetailsContainer = ({ member }: MemberDetailsContainer) => {
  const { translate } = useTranslationContext();
  const [usageDetails, setUsageDetails] = useState<UsageDetailsProps | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeactivatingMember, setIsDeactivatingMember] = useState(false);
  const [isRequestChangePasswordModalOpen, setIsRequestChangePasswordModalOpen] = useState(false);
  const [isSendingPasswordRequest, setIsSendingPasswordRequest] = useState(false);

  // TODO: USED PERSONAL USER DATA UNTIL WE HAVE NEW ENDPOINTS FOR WORKSPACE MEMBERS
  useEffect(() => {
    usageService
      .getUsageDetails()
      .then((usageDetails) => {
        setUsageDetails(usageDetails);
      })
      .catch((err) => {
        const error = errorService.castError(err);
        errorService.reportError(error);
      });
  }, []);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const planUsage = useAppSelector((state: RootState) => state.plan.planUsage);
  const planLimitInBytes = plan.planLimit;
  const products: Parameters<typeof UsageDetails>[0]['products'] | null = planUsage
    ? [
        {
          name: translate('sideNav.drive'),
          usageInBytes: usageDetails?.drive ?? 0,
          color: 'primary',
        },
        {
          name: translate('sideNav.photos'),
          usageInBytes: usageDetails?.photos ?? 0,
          color: 'orange',
        },
        {
          name: translate('views.account.tabs.account.view.backups'),
          usageInBytes: usageDetails?.backups ?? 0,
          color: 'indigo',
        },
      ]
    : null;
  products?.sort((a, b) => b.usageInBytes - a.usageInBytes);
  const usedProducts = products?.filter((product) => product.usageInBytes > 0);

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex flex-row  justify-between">
        <UserCard
          name={member.name}
          lastname={member.lastname}
          role={member.role}
          email={member.email}
          avatarsrc={null}
          styleOptions={{
            avatarDiameter: 80,
            nameStyle: 'text-2xl font-medium text-gray-100',
            emailStyle: 'text-base font-normal text-gray-60',
            rolePosition: 'column',
          }}
        />
        <div className="relative flex items-center justify-end">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-10 bg-gray-5 shadow-sm"
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
          >
            <DotsThreeVertical size={24} />
          </button>
          {isOptionsOpen && (
            <button onClick={() => setIsOptionsOpen(false)} className="absolute flex h-full w-full">
              <div className="absolute right-0 top-16 flex flex-col items-center justify-center rounded-md border border-gray-10 bg-gray-5 shadow-sm">
                <button
                  onClick={() => setIsRequestChangePasswordModalOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-t-md px-3 hover:bg-gray-20"
                >
                  <span className="truncate">Request password change</span>
                </button>
                <button
                  onClick={() => setIsDeactivateModalOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-b-md px-3 hover:bg-gray-20"
                >
                  <span className="truncate">Deactivate user</span>
                </button>
              </div>
            </button>
          )}
        </div>
      </div>
      <Card className={' w-full space-y-6 '}>
        {products && usedProducts && planLimitInBytes ? (
          <UsageBar
            products={products}
            planUsage={planUsage}
            usedProducts={usedProducts}
            planLimitInBytes={planLimitInBytes}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center">
            <Spinner className="h-7 w-7 text-primary" />
          </div>
        )}
      </Card>
      <DeactivateMemberModal
        name={member.name + ' ' + member.lastname}
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onDeactivate={() => {
          setIsDeactivatingMember(true);
          setTimeout(() => {
            setIsDeactivatingMember(false);
            setIsDeactivateModalOpen(false);
          }, 2000);
        }}
        isLoading={isDeactivatingMember}
      />
      <RequestPasswordChangeModal
        isOpen={isRequestChangePasswordModalOpen}
        onClose={() => setIsRequestChangePasswordModalOpen(false)}
        onSendRequest={() => {
          setIsSendingPasswordRequest(true);
          setTimeout(() => {
            setIsRequestChangePasswordModalOpen(false);
            setIsSendingPasswordRequest(false);
          }, 2000);
        }}
        isLoading={isSendingPasswordRequest}
        modalWitdhClassname="w-120"
      />
    </div>
  );
};

export default MemberDetailsContainer;
