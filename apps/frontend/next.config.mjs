/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude Walrus packages from server-side bundling
  // Walrus SDK requires WASM files that are not available during SSR/SSG
  serverExternalPackages: [
    '@mysten/walrus',
    '@mysten/walrus-wasm',
  ],
  // Configure webpack to handle WASM files
  webpack: (config, { isServer }) => {
    if (isServer) {
      // On the server, externalize Walrus packages to avoid WASM loading issues
      config.externals = config.externals || [];
      config.externals.push('@mysten/walrus', '@mysten/walrus-wasm');
    } else {
      // On the client, configure WASM loading
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
    }
    return config;
  },
};

export default nextConfig;
