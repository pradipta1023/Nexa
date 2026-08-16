import apiClient from './client';

export const queryDocs = async (question, profile, conversationId) => {
  const payload = { question, conversationId };
  if (profile) payload.profile = profile;
  
  const response = await apiClient.post('/query', payload);
  return response.data;
};

export const queryDocsStream = async (question, profile, conversationId, onToken, onDone, onError, signal) => {
  const payload = { question, conversationId };
  if (profile) payload.profile = profile;
  
  try {
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let errorMsg = 'Failed to query';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;
        
        const dataStr = line.slice(6).trim(); // remove 'data: '
        if (dataStr === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.token) {
            onToken(parsed.token);
          }
        } catch (e) {
          console.warn("Failed to parse SSE JSON:", e);
        }
      }
    }
    
    onDone();
  } catch (error) {
    onError(error);
  }
};
