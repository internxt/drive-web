import icons from '../../assets/images/photos-empty.svg';

export default function Empty({ className = '' }: { className?: string }): JSX.Element {
  const externalLinkIcon = (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20.75 9.875V4.25H15.125"
        stroke="#0066FF"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path d="M14 11L20.75 4.25" stroke="#0066FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path
        d="M17.75 14V20C17.75 20.1989 17.671 20.3897 17.5303 20.5303C17.3897 20.671 17.1989 20.75 17 20.75H5C4.80109 20.75 4.61032 20.671 4.46967 20.5303C4.32902 20.3897 4.25 20.1989 4.25 20V8C4.25 7.80109 4.32902 7.61032 4.46967 7.46967C4.61032 7.32902 4.80109 7.25 5 7.25H11"
        stroke="#0066FF"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );

  return (
    <div className={`${className} flex w-full h-full items-center justify-center bg-white-rect`}>
      <div className="w-96 text-center">
        <div className="mx-auto w-max">
          <img src={icons} alt="Photos empty icon" />
        </div>
        <h2 className="mt-5 text-3xl text-gray-100 font-semibold">Your gallery is empty</h2>
        <p className="text-lg text-gray-60 mt-2" style={{ lineHeight: '1.35rem' }}>
          Start using Internxt Photos to sync all your memories from all your devices in one place
        </p>
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center mt-5 no-underline text-primary text-lg font-medium hover:text-primary-dark"
        >
          <p className="mr-1">How to sync all my phone photos</p> {externalLinkIcon}
        </a>
      </div>
    </div>
  );
}
