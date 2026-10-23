import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/**': ['./gas/**/*', './*.html'],
  },
};

export default nextConfig;

