import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the agent system-prompt markdown is bundled into the serverless
  // function — Next can't trace dynamic fs.readFile paths, so we list it.
  outputFileTracingIncludes: {
    "/agent": ["./src/lib/voice/bolna/prompts/**/*.md"],
  },
};

export default nextConfig;
