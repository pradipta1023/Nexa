import apiClient from './client';

export const ingestText = async (text, metadata) => {
  const response = await apiClient.post('/ingest/text', { text, metadata });
  return response.data;
};

export const ingestPdf = async (file, metadata) => {
  const formData = new FormData();
  formData.append('pdf', file);
  
  if (metadata) {
    // metadata is already parsed as an object by validateJson before calling API
    formData.append('metadata', JSON.stringify(metadata));
  }

  const response = await apiClient.post('/ingest/pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
