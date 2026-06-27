/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rajask/ui", "@rajask/core", "@rajask/auth", "@rajask/db"],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
