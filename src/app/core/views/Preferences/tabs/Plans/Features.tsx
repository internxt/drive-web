import { ArrowsClockwise, Check, LockKey, Shield } from 'phosphor-react';

export default function Features({ className = '' }: { className?: string }): JSX.Element {
  const sections: { title: string; icon: typeof Shield; points: string[] }[] = [
    {
      title: 'Satisfaction guaranteed',
      icon: Shield,
      points: [
        'All subscriptions have 30-day money-back guarantees.',
        'Cancel any time, no tricks.',
        'Premium support.',
      ],
    },
    {
      title: 'Secure by default',
      icon: LockKey,
      points: [
        'Military-grade encryption to ensure your privacy.',
        'Encrypted file storage and sharing.',
        'Zero-knowledge cloud storage.',
      ],
    },
    {
      title: 'Unlimited access and sync',
      icon: ArrowsClockwise,
      points: [
        'Access your files, photos, and backups from all your devices.',
        'Sync with unlimited bandwidth.',
        'Backup any folder on your computer.',
      ],
    },
  ];
  return (
    <div className={`${className}`}>
      <h1 className="text-2xl font-medium text-gray-100 lg:text-center">Features included in all plans</h1>
      <div className="mt-7 justify-between space-y-6 lg:flex lg:space-y-0 lg:space-x-6">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-1 flex-col">
            <div className="flex items-center">
              <section.icon size={24} weight="duotone" className="text-primary" />
              <h1 className="ml-2 flex-1 text-lg font-medium text-gray-80">{section.title}</h1>
            </div>
            <div className="mt-3 space-y-2 pl-2">
              {section.points.map((point) => (
                <div key={point} className="flex flex-row">
                  <Check size={16} weight="bold" className="mt-1 text-gray-40" />
                  <p className="ml-2 flex-1 text-gray-80">{point}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
