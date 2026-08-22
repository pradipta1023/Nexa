import apiClient from './client';

export const knowledgeBaseApi = {
  // Knowledge Bases
  createKB: async (data) => {
    const response = await apiClient.post('/knowledge-bases', data);
    return response.data;
  },

  listKBs: async () => {
    const response = await apiClient.get('/knowledge-bases');
    return response.data;
  },

  getKB: async (id) => {
    const response = await apiClient.get(`/knowledge-bases/${id}`);
    return response.data;
  },

  updateKB: async (id, data) => {
    const response = await apiClient.patch(`/knowledge-bases/${id}`, data);
    return response.data;
  },

  deleteKB: async (id) => {
    const response = await apiClient.delete(`/knowledge-bases/${id}`);
    return response.data;
  },

  // Resources
  createResource: async (kbId, data) => {
    const response = await apiClient.post(`/knowledge-bases/${kbId}/resources`, data);
    return response.data;
  },

  listResources: async (kbId, type = null) => {
    const params = type ? { type } : {};
    const response = await apiClient.get(`/knowledge-bases/${kbId}/resources`, { params });
    return response.data;
  },

  getResource: async (kbId, resourceId) => {
    const response = await apiClient.get(`/knowledge-bases/${kbId}/resources/${resourceId}`);
    return response.data;
  },

  updateResourceMetadata: async (kbId, resourceId, data) => {
    const response = await apiClient.patch(`/knowledge-bases/${kbId}/resources/${resourceId}`, data);
    return response.data;
  },

  deleteResource: async (kbId, resourceId) => {
    const response = await apiClient.delete(`/knowledge-bases/${kbId}/resources/${resourceId}`);
    return response.data;
  }
};
