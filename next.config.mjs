/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/productive-tracker',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
