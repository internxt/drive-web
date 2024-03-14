import { NavSection } from '../containers/SectionListContainer';
import SectionItem, { SectionItemProps } from './SectionItem';

interface SectionListProps {
  sectionItems: (SectionItemProps & { section: string; subsection?: string })[];
  activeSection?: NavSection;
  goSection: (sectoinItemProps: { section?: string; subsection?: string }) => void;
}

const SectionList = ({ sectionItems, activeSection, goSection }: SectionListProps) => {
  return (
    <div className="overflow-x-auto">
      {sectionItems.map((sectionProps) => {
        const itemSection = sectionProps.section;
        const itemSubsection = sectionProps.subsection;

        const isActive = itemSection === activeSection?.section && itemSubsection === activeSection?.subsection;
        const handleOnClick =
          itemSection && itemSubsection
            ? () => goSection({ section: itemSection, subsection: itemSubsection })
            : undefined;

        return (
          <SectionItem
            key={`${sectionProps.section}-${sectionProps.subsection}`}
            onClick={handleOnClick}
            {...sectionProps}
            isActive={isActive}
          />
        );
      })}
    </div>
  );
};

export default SectionList;
