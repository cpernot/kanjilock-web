/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // Optional: Disable image optimization if using standard <img> tags, as Next.js Image component requires a Node.js server unless properly configured
  images: { unoptimized: true }
};

export default nextConfig;
