import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Raised from the 1MB default so admins can upload module video files
      // directly (see src/lib/uploads.ts's MAX_VIDEO_FILE_SIZE).
      bodySizeLimit: "500mb",
    },
    // proxy.ts (our auth gate) runs on this route too and separately buffers
    // the request body, capped at 10MB by default — without raising this,
    // proxy truncates large uploads before the server action ever sees them,
    // which surfaces as "Unexpected end of form".
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
