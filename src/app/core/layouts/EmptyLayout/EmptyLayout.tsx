export interface EmptyLayoutProps {
  children: JSX.Element;
}

export default function EmptyLayout(props: Readonly<EmptyLayoutProps>): JSX.Element {
  const { children } = props;

  return <div className="h-full">{children}</div>;
}
