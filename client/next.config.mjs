/** @type {import('next').NextConfig} */
const nextConfig = {
  // dev tunnel hostnames that may load the dev server's assets and HMR
  allowedDevOrigins: ['n68r2ww1-3000.uks1.devtunnels.ms', 'n68r2ww1.uks1.devtunnels.ms'],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
