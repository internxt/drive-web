import picture from '../../assets/images/empty-photos.png';
import { ArrowSquareOut } from 'phosphor-react';

export default function Empty({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={`${className} bg-white-rect flex h-full w-full items-center justify-center`}>
      <div className="flex flex-col items-center justify-center space-y-10 text-center">
        <div className="mx-auto w-72">
          <img src={picture} draggable="false" alt="Photos used in the Internxt app" />
        </div>

        <div className="flex flex-col items-center space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <h2 className="text-3xl font-semibold text-gray-100">Your gallery is empty</h2>

            <p className="text-lg text-gray-60">
              Start using Internxt mobile app to sync all your photos
            </p>
          </div>

          <a
            href=""
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-row items-center text-lg font-medium text-primary no-underline hover:text-primary-dark space-x-1.5"
          >
            <p>Sync all your photos using Internxt app</p>
            <ArrowSquareOut size={24} />
          </a>
        </div>
      </div>
    </div>
  );
}
