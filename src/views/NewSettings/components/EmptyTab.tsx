interface EmptyTabsProps {
  icon: string;
  title: string;
  subtitle: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}
const EmptyTab = ({ icon, title, subtitle, action }: EmptyTabsProps): JSX.Element => {
  return (
    <section className="flex h-full w-full flex-col items-center justify-center rounded-xl border border-gray-10 bg-gray-1 py-10">
      <img className="mb-3" alt={title} src={icon} />
      <p className="mb-1 text-base font-medium text-gray-100">{title}</p>
      <p className="font-regular w-80 text-center text-sm text-gray-60">{subtitle}</p>
      {action && (
        <button className="mt-3 text-base font-medium text-primary" onClick={action.onClick}>
          {action.text}
        </button>
      )}
    </section>
  );
};

export default EmptyTab;
