import React, { useState } from 'react';
import { queryDocsStream } from '../api/queryApi';
import StatusAlert from './StatusAlert';

const QueryCard = () => {
  const [question, setQuestion] = useState('');
  const [profile, setProfile] = useState('flash');
  const [status, setStatus] = useState('idle'); // idle, loading, streaming, success, error
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');

  const handleQuery = async () => {
    if (!question.trim()) {
      setStatus('error');
      setMessage('Question is required.');
      return;
    }

    setStatus('loading');
    setMessage('Connecting to knowledge base...');
    setAnswer(''); 

    const handleToken = (token) => {
      setStatus('streaming');
      setMessage(''); // Clear loading message as soon as streaming starts
      setAnswer((prev) => prev + token);
    };

    const handleStreamDone = () => {
      setStatus('success');
    };

    const handleStreamError = (error) => {
      setStatus('error');
      setMessage(error.message || 'An error occurred while querying.');
    };

    queryDocsStream(
      question,
      profile,
      handleToken,
      handleStreamDone,
      handleStreamError
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Query</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
            rows="3"
            placeholder="Ask a question about your documents..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={status === 'loading' || status === 'streaming'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile
          </label>
          <select
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            disabled={status === 'loading' || status === 'streaming'}
          >
            <option value="flash">Flash (Fast)</option>
            <option value="thinking">Thinking (Deep Reasoning)</option>
          </select>
        </div>

        <button
          onClick={handleQuery}
          disabled={status === 'loading' || status === 'streaming'}
          className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? 'Connecting...' : status === 'streaming' ? 'Generating...' : 'Ask'}
        </button>

        <StatusAlert status={status === 'streaming' ? 'idle' : status} message={message} />

        {/* Generated Answer Display */}
        {answer && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">Answer</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-gray-800 whitespace-pre-wrap leading-relaxed">
              {answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryCard;
