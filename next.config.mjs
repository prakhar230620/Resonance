/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Map legacy icon sizes to existing assets to avoid 404s
      { source: "/icon-144.png", destination: "/icon-192.png" },
      { source: "/icon-96.png", destination: "/icon-192.png" },
      { source: "/icon-128.png", destination: "/icon-192.png" },
      { source: "/icon-152.png", destination: "/icon-192.png" },
      { source: "/icon-72.png", destination: "/icon-192.png" },
      { source: "/icon-384.png", destination: "/icon-512.png" },
    ]
  },
}

export default nextConfig
