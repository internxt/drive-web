const IntervalSwitch = ({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick?: () => void;
}): JSX.Element => {
  return (
    <button
      className={`${
        active ? 'bg-surface text-gray-100 shadow-sm dark:bg-gray-20' : 'text-gray-50'
      } rounded-lg px-6 py-1.5 font-medium`}
      onClick={onClick}
    >
      {text}
    </button>
  );
};

export default IntervalSwitch;
