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
        <props.icon className="mr-2 text-primary" />
        {props.title}
      </div>
      <span className="text-gray-50">{props.description}</span>
    </div>
  );
};

export default TextBlock;
