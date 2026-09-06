import { getChromaClient } from '../../src/config/chromaConfig.js';
import { ChromaClient, CloudClient } from 'chromadb';

describe('Chroma Configuration', () => {
  it('should return local ChromaClient by default', () => {
    const client = getChromaClient({});
    expect(client).toBeInstanceOf(ChromaClient);
    expect(client.apiClient.getConfig().baseUrl).toBe('http://localhost:8000');
  });

  it('should return CloudClient when CHROMA_ENV is cloud', () => {
    const env = {
      CHROMA_ENV: 'cloud',
      CHROMA_CLOUD_API_KEY: 'test-key'
    };
    
    const client = getChromaClient(env);
    expect(client).toBeInstanceOf(CloudClient);
    expect(client.tenant).toBe('default_tenant');
    expect(client.database).toBe('NexaDB');
  });
});
