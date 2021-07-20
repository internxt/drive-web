interface SideInfoProps { }

const texts = {
  label: 'INTERNXT',
  title: 'Privacy security and flexible',
  subtitle: 'Drive cloud storage is part of the ecosystem of solutions developed by Internxt to protect the security and privacy of companies and individuals',
  link: 'internxt.com',
  href: 'https://internxt.com'
};

const SideInfo = (props: SideInfoProps): JSX.Element => {
  return (
    <div className='flex flex-col justify-center w-104 min-w-104 h-full background-login bg-gradient-to-b from-blue-60 to-blue-80 pl-20 text-white'>
      <span className='text-xl font-semibold tracking-0.3'>{texts.label}</span>

      <span className='w-40 text-3xl mt-7'>{texts.title}</span>

      <span className='w-50 text-base mt-6'>{texts.subtitle}</span>

      <a className='secondary text-base font-semibold mt-9' href={texts.href}>{texts.link}</a>
    </div>
  );
};

export default SideInfo;
