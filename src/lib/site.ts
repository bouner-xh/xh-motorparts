export const defaultBaseUrl = 'https://xh-motorparts.com';

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || defaultBaseUrl;
}
