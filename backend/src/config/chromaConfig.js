import { ChromaClient, CloudClient } from 'chromadb';

export const getChromaClient = (env = process.env) => {
  const isChromaCloud = env.CHROMA_ENV === 'cloud';
  
  if (isChromaCloud) {
    return new CloudClient({
      tenant: env.CHROMA_CLOUD_TENANT || 'default_tenant',
      database: env.CHROMA_CLOUD_DATABASE || 'NexaDB',
      apiKey: env.CHROMA_CLOUD_API_KEY
    });
  }

  return new ChromaClient({
    host: env.CHROMA_HOST || 'localhost',
    port: env.CHROMA_PORT || 8000,
    ssl: false
  });
};
