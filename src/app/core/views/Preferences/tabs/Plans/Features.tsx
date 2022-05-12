import { ArrowsClockwise, Check, LockKey, Shield } from 'phosphor-react';

export default function Features({ className = '' }: { className?: string }): JSX.Element {
  const sections: { title: string; icon: typeof Shield; points: string[] }[] = [
    {
      title: 'Satisfaction guaranteed',
      icon: Shield,
      points: [
        'All subscriptions have 30 days money-back guarantee.',
        'Cancel any time, no tricks.',
        'Premium support.',
      ],
    },
    {
      title: 'Security by default',
      icon: LockKey,
      points: ['Military grade encryption to ensure your privacy.', 'Encrypted file storage and sharing.'],
    },
    {
      title: 'Unlimited access and sync',
      icon: ArrowsClockwise,
      points: [
        'Access your files, photos and backups from all your devices.',
        'Sync with unlimited bandwidth.',
        'Backup any folder in your computer.',
      ],
    },
  ];
  return (
    <div className={`${className}`}>
      <h1 className="text-2xl font-medium text-gray-100 lg:text-center">Features included in all plans</h1>
      <div className="mt-7 justify-between space-y-7 lg:flex lg:space-y-0">
        {sections.map((section) => (
          <div className="w-64">
            <div className="flex items-center">
              <section.icon size={24} weight="duotone" className="text-primary" />
              <h1 className="ml-2 flex-1 text-lg font-medium text-gray-80">{section.title}</h1>
            </div>
            <div className="mt-3 space-y-3 pl-2">
              {section.points.map((point) => (
                <div className="flex">
                  <Check size={16} className="text-gray-40" />
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
