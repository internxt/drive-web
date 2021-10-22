export interface EmptyLayoutProps {
  children: JSX.Element;
}

export default function EmptyLayout(props: EmptyLayoutProps): JSX.Element {
  const { children } = props;

  return <div className="h-full">{children}</div>;
}
