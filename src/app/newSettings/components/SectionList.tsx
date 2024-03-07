import SectionItem, { SectionItemProps } from './SectionItem';

interface SectionListProps {
  sectionItems: SectionItemProps[];
}

const SectionList = ({ sectionItems }: SectionListProps) => {
  return (
    <div className="overflow-x-auto">
      {sectionItems.map((sectionProps, index) => (
        <SectionItem key={`${sectionProps.text}-${index}`} {...sectionProps} />
      ))}
    </div>
  );
};

export default SectionList;
