/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  // This prevents Vercel from trying to pre-render API routes at build time
  output: "standalone",
};

export default nextConfig;
