// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from WhatsApp/Meta CDN
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.whatsapp.net" },
      { protocol: "https", hostname: "**.fbcdn.net" },
    ],
  },

  // Required for Prisma in serverless environments
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
