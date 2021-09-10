import { FunctionComponent, SVGProps } from 'react';

interface AccountAdviceProps {
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

const AccountAdvice = (props: AccountAdviceProps): JSX.Element => {
  return (
    <div className="account-advice-component">
      <div className="mb-2 flex">
        <props.icon className="text-blue-40 mr-2" />
        {props.title}
      </div>
      <span className="text-m-neutral-100">{props.description}</span>
    </div>
  );
};

export default AccountAdvice;
