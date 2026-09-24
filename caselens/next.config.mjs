/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ["app", "components", "lib", "server", "types"] },
  // pdf.js resolves its worker entry point by path at runtime. Bundling it
  // rewrites that path into .next/server/chunks, where the worker file is not
  // traced, and extraction fails in a production build. Loading the package
  // from node_modules keeps the resolution correct.
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
