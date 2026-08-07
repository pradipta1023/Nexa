import apiClient from './client';

export const queryDocs = async (question, topK) => {
  const payload = { question };
  if (topK) {
    payload.topK = Number(topK);
  }
  
  const response = await apiClient.post('/query', payload);
  return response.data;
};
