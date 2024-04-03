import { Route, RouteProps } from 'react-router-dom';
import views from '../core/config/views';
import layouts from '../core/layouts';
import configService from '../core/services/config.service';
import { AppViewConfig } from '../core/types';
import { createElement } from 'react';

const getRoutes = (): JSX.Element[] => {
  const routes: JSX.Element[] = views.map((v) => {
    const viewConfig: AppViewConfig | undefined = configService.getViewConfig({ id: v.id });
    const layoutConfig = layouts.find((l) => l.id === viewConfig?.layout) ?? layouts[0];
    const componentProps: RouteProps = {
      exact: !!viewConfig?.exact,
      path: viewConfig?.path ?? '',
      render: (props) =>
        createElement(layoutConfig.component, {
          children: createElement(v.component, { ...props, ...v.componentProps }),
        }),
    };

    return <Route key={v.id} {...componentProps} />;
  });

  return routes;
};

export { getRoutes };
