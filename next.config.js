/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['pdfjs-dist'],
  async headers() {
    return [
      {
        // Digital Asset Links for TWA / Android App Links verification.
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
