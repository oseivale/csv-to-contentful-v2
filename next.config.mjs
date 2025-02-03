/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        CONTENTFUL_MANAGEMENT_TOKEN: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
        CONTENTFUL_SPACE_ID: process.env.CONTENTFUL_SPACE_ID,
        CONTENTFUL_ENVIRONMENT: process.env.CONTENTFUL_ENVIRONMENT || "master",
      },
};

export default nextConfig;
