import apiClient from './client';

export const ingestText = async (knowledgeBaseId, resourceId, text, metadata) => {
  const response = await apiClient.post(`/knowledge-bases/${knowledgeBaseId}/resources/${resourceId}/ingest/text`, { text, metadata });
  return response.data;
};

export const ingestPdf = async (knowledgeBaseId, resourceId, file, metadata) => {
  const formData = new FormData();
  formData.append('pdf', file);
  
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }

  const response = await apiClient.post(`/knowledge-bases/${knowledgeBaseId}/resources/${resourceId}/ingest/pdf`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
