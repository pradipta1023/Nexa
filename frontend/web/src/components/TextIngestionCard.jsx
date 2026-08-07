import React, { useState } from 'react';
import { ingestText } from '../api/ingestionApi';
import { validateJson } from '../utils/validateJson';
import StatusAlert from './StatusAlert';

const TextIngestionCard = () => {
  const [text, setText] = useState('');
  const [metadata, setMetadata] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleIngest = async () => {
    if (!text.trim()) {
      setStatus('error');
      setMessage('Text content is required.');
      return;
    }

    const { isValid, parsed, error } = validateJson(metadata);
    
    if (!isValid) {
      setStatus('error');
      setMessage(`Metadata JSON is invalid: ${error}`);
      return;
    }

    setStatus('loading');
    setMessage('Ingesting text...');

    try {
      await ingestText(text, parsed);
      setStatus('success');
      setMessage('Text successfully ingested!');
      setText('');
      setMetadata('');
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'An error occurred during ingestion.'
      );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Text Ingestion</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Text Content <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
            rows="4"
            placeholder="Enter text to ingest..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={status === 'loading'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metadata (Optional JSON)
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
            rows="3"
            placeholder='{"source": "wiki", "author": "john"}'
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            disabled={status === 'loading'}
          />
        </div>

        <button
          onClick={handleIngest}
          disabled={status === 'loading'}
          className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? 'Ingesting...' : 'Ingest Text'}
        </button>

        <StatusAlert status={status} message={message} />
      </div>
    </div>
  );
};

export default TextIngestionCard;
