import {defineRouting} from 'next-intl/routing';
import {locales} from '../lib/catalog';

export const routing = defineRouting({
  locales: locales as unknown as string[],
  defaultLocale: 'en',
  localePrefix: 'always'
});
