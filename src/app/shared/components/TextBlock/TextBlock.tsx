import { FunctionComponent, SVGProps } from 'react';

interface TextBlockProps {
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

const TextBlock = (props: TextBlockProps): JSX.Element => {
  return (
    <div className="account-advice-component">
      <div className="mb-2 flex">
        <props.icon className="text-blue-40 mr-2" />
        {props.title}
      </div>
      <span className="text-neutral-100">{props.description}</span>
    </div>
  );
};

export default TextBlock;
