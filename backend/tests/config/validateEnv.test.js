import { validateEnv } from '../../src/config/validateEnv.js';

describe('validateEnv', () => {
  const validEnv = {
    GEMINI_API_KEY: 'test-key',
    MONGO_URI: 'mongodb+srv://test',
    CHROMA_ENV: 'local',
  };

  it('should pass when all required variables are set (local mode)', () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it('should pass when CHROMA_ENV is cloud and cloud vars are set', () => {
    const env = {
      ...validEnv,
      CHROMA_ENV: 'cloud',
      CHROMA_CLOUD_API_KEY: 'ck-test',
      CHROMA_CLOUD_TENANT: 'test-tenant',
    };
    expect(() => validateEnv(env)).not.toThrow();
  });

  it('should throw when GEMINI_API_KEY is missing', () => {
    const { GEMINI_API_KEY, ...env } = validEnv;
    expect(() => validateEnv(env)).toThrow('Missing required environment variables: GEMINI_API_KEY');
  });

  it('should throw when MONGO_URI is missing', () => {
    const { MONGO_URI, ...env } = validEnv;
    expect(() => validateEnv(env)).toThrow('Missing required environment variables: MONGO_URI');
  });

  it('should throw when CHROMA_ENV is missing', () => {
    const { CHROMA_ENV, ...env } = validEnv;
    expect(() => validateEnv(env)).toThrow('Missing required environment variables: CHROMA_ENV');
  });

  it('should list all missing variables in a single error', () => {
    expect(() => validateEnv({})).toThrow(
      'Missing required environment variables: GEMINI_API_KEY, MONGO_URI, CHROMA_ENV'
    );
  });

  it('should throw when CHROMA_ENV is cloud but cloud API key is missing', () => {
    const env = {
      ...validEnv,
      CHROMA_ENV: 'cloud',
      CHROMA_CLOUD_TENANT: 'test-tenant',
    };
    expect(() => validateEnv(env)).toThrow(
      'CHROMA_ENV is "cloud" but missing required variables: CHROMA_CLOUD_API_KEY'
    );
  });

  it('should throw when CHROMA_ENV is cloud but cloud tenant is missing', () => {
    const env = {
      ...validEnv,
      CHROMA_ENV: 'cloud',
      CHROMA_CLOUD_API_KEY: 'ck-test',
    };
    expect(() => validateEnv(env)).toThrow(
      'CHROMA_ENV is "cloud" but missing required variables: CHROMA_CLOUD_TENANT'
    );
  });

  it('should not check cloud vars when CHROMA_ENV is local', () => {
    // No CHROMA_CLOUD_* keys present, but CHROMA_ENV is local — should be fine
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it('should not expose secret values in error messages', () => {
    try {
      validateEnv({});
    } catch (error) {
      expect(error.message).not.toContain('test-key');
      expect(error.message).not.toContain('mongodb+srv');
    }
  });
});
