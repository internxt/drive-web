const FilterItem = ({ id, Icon, name, filters, setFilters }): JSX.Element => {
  const toggleFilter = (filter) => {
    if (filters.includes(filter)) {
      setFilters((currentFilters) => currentFilters.filter((currentFilter) => currentFilter !== filter));
    } else {
      setFilters((currentFilters) => [...currentFilters, filter]);
    }
  };

  return (
    <div
      className={`${
        filters.includes(id)
          ? 'bg-primary bg-opacity-10 text-primary ring-primary ring-opacity-20'
          : 'bg-white text-gray-80 ring-gray-10 hover:bg-gray-1 hover:shadow-sm hover:ring-gray-20 active:bg-gray-5 active:ring-gray-30'
      } flex h-8 cursor-pointer items-center space-x-2 rounded-full px-3 font-medium shadow-sm ring-1 transition-all duration-100 ease-out`}
      onClick={() => toggleFilter(id)}
    >
      <Icon className="h-5 w-5 drop-shadow-sm filter" />
      <span className="text-sm">{name}</span>
    </div>
  );
};

export default FilterItem;
