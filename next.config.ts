import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  redirects: async () => [
    { source: '/proto/london-island', destination: '/', permanent: true },
    { source: '/proto/london-island/surface', destination: '/', permanent: true },
    {
      source: '/proto/bomb-sites',
      has: [{ type: 'query', key: 'v', value: '1' }],
      destination: '/',
      permanent: true,
    },
  ],
};
export default config;
