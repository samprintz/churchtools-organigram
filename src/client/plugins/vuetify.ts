import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export default createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          'accent': '#1565C0',
          'on-surface': '#333333',
          'chart-border': '#CCCCCC',
          'chart-header-l1': '#455A64',
        },
      },
      dark: {
        colors: {
          'accent': '#1976D2',
          'on-surface': '#d0d0d0',
          'chart-border': '#555555',
          'chart-header-l1': '#52565a',
        },
      },
    },
  },
});
