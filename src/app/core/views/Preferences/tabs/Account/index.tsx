import UserHeader from './UserHeader';

export default function AccountTab({ isHidden }: { isHidden: boolean }): JSX.Element {
  return (
    <div className={`h-full w-full ${isHidden ? 'hidden' : ''}`}>
      <UserHeader />
    </div>
  );
}
