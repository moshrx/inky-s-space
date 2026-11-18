/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [{ source: "/api/:path((?!visits?$).*)", destination: "/closed" }],
    };
  },
  async redirects() {
    return [
      { source: "/stars", destination: "/space", permanent: true },
    ];
  },
};

export default nextConfig;
