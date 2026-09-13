/**
 * Validates that all required environment variables are set.
 * Throws a descriptive error on the first missing variable.
 * Never exposes secret values in error messages.
 */
const REQUIRED_VARS = [
  'GEMINI_API_KEY',
  'MONGO_URI',
  'CHROMA_ENV',
];

const CHROMA_CLOUD_VARS = [
  'CHROMA_CLOUD_API_KEY',
  'CHROMA_CLOUD_TENANT',
];

export function validateEnv(env = process.env) {
  const missing = REQUIRED_VARS.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (env.CHROMA_ENV === 'cloud') {
    const missingCloud = CHROMA_CLOUD_VARS.filter((key) => !env[key]);
    if (missingCloud.length > 0) {
      throw new Error(
        `CHROMA_ENV is "cloud" but missing required variables: ${missingCloud.join(', ')}`
      );
    }
  }
}
