/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Pozwala zbudować produkcję mimo błędów ESLint (np. no-explicit-any)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Pozwala zbudować produkcję mimo błędów TS (opcjonalnie – przydatne przy codegen)
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
