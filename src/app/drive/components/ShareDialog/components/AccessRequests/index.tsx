import AccessRequestsEmptyState from './empty';
import AccessRequestsList from './list';

const AccessRequests = () => {
  const mockedRequests = [
    {
      user: {
        name: 'John Doe',
        email: '4V0oX@example.com',
        avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
      },
      message: 'Hello there',
      onDecline: () => {},
      onAccept: () => {},
    },
  ];

  if (mockedRequests.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <AccessRequestsEmptyState />
      </div>
    );
  }

  return (
    <div className="flex min-h-[430px] flex-col items-center w-full">
      <AccessRequestsList accessRequestList={mockedRequests} />
    </div>
  );
};

export default AccessRequests;
