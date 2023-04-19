import React from 'react';
import { House, Lifebuoy, Question } from 'phosphor-react';
export default function notFound() {
  const cards = [
    {
      icon: House,
      title: 'Return Home',
      description: 'Go back to Internxt Drive.',
      urlRedirect: 'https://drive.internxt.com/app',
    },
    {
      icon: Question,
      title: 'Visit Help Center',
      description: 'Troubleshoot common issues and browse our FAQ.',
      urlRedirect: 'https://help.internxt.com/en/',
    },
    {
      icon: Lifebuoy,
      title: 'Contact Support',
      description: 'Reach out to our Support Team at hello@internxt.com.',
      urlRedirect: 'mailto:hello@internxt.com',
    },
  ];

  return (
    <>
      <section className="overflow-hidden px-5 py-32">
        <div className="content flex flex-col items-center justify-center space-y-4 lg:pt-10">
          <div className="flex flex-col rounded-lg bg-gray-5 px-4 py-2">
            <p className="text-xl font-medium text-gray-80">Error 404</p>
          </div>
          <div className="flex flex-col items-center justify-center space-y-24">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-6xl font-bold text-gray-100">Nothing to see here...</h1>
              <p className="text-xl text-gray-80">The page you are looking for could not be found.</p>
            </div>
            <div className="flex flex-row flex-wrap items-center justify-center gap-10">
              {cards.map((card, index) => (
                <div
                  className="flex h-52 cursor-pointer select-none flex-col items-center justify-start space-y-4 rounded-lg bg-gray-1 px-4 py-8 text-center"
                  key={index}
                  onClick={() => {
                    window.location.href = card.urlRedirect;
                  }}
                >
                  <card.icon size={32} className="text-primary" />
                  <p className="text-lg font-medium text-gray-100">{card.title}</p>
                  <p className="w-50 text-base text-gray-80">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
