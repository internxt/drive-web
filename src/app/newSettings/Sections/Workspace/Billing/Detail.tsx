const Detail = ({
  className = '',
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}): JSX.Element => {
  return (
    <div className={`${className} min-w-0 text-gray-80`}>
      <h1 className="truncate text-sm font-medium">{label}</h1>
      <h2 className="line-clamp-3 text-sm font-normal">{value}</h2>
    </div>
  );
};
export default Detail;
