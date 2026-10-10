// Server-side only (never sent to the browser): where the Express backend lives.
// Accepts the URL with or without a trailing "/api".
const API_URL = (process.env.API_URL || 'http://localhost:5050').replace(/\/+$/, '').replace(/\/api$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // dev tunnel hostnames that may load the dev server's assets and HMR
  allowedDevOrigins: ['n68r2ww1-3000.uks1.devtunnels.ms', 'n68r2ww1.uks1.devtunnels.ms'],
  cacheComponents: true,
  partialPrefetching: true,

  // The browser calls /api/... on this site; Next forwards it to the backend.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
