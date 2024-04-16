import Section from 'app/core/views/Preferences/components/Section';
import PlanSelectionCard from './components/PlanSelectionCard';

const PlansSection = () => {
  return (
    <Section title="Plans" className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6">
      <PlanSelectionCard
        onClick={() => false}
        isSelected={true}
        capacity={'2 GB'}
        currency={'Free forever'}
        price={''}
        billing={''}
      />
      <PlanSelectionCard
        onClick={() => false}
        isSelected={false}
        capacity={'2 GB'}
        currency={'Free forever'}
        price={''}
        billing={''}
      />
      <PlanSelectionCard
        onClick={() => false}
        isSelected={false}
        capacity={'2 GB'}
        currency={'Free forever'}
        price={''}
        billing={''}
      />
    </Section>
  );
};

export default PlansSection;
