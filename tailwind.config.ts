import config from '@internxt/css-config';

export default {
  ...config,
  content: ['./node_modules/@internxt/ui/dist/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    ...config.theme,
    colors: {
      ...config.theme.colors,
      'orange-60': 'rgb(var(--color-orange-60) / <alpha-value>)',
      danger: 'rgb(var(--color-danger) / <alpha-value>)',
    },
  },
};
