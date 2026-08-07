import React, { useState } from 'react';
import { queryDocs } from '../api/queryApi';
import StatusAlert from './StatusAlert';

const QueryCard = () => {
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');

  const handleQuery = async () => {
    if (!question.trim()) {
      setStatus('error');
      setMessage('Question is required.');
      return;
    }

    setStatus('loading');
    setMessage('Searching for an answer...');
    setAnswer(''); // clear any previous answer

    try {
      const result = await queryDocs(question, topK);
      
      setStatus('success');
      setMessage(''); // Clear message on success to focus on the answer
      
      // Set the answer from the expected response format { answer: "..." }
      setAnswer(result.answer || 'No answer returned.');
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'An error occurred while querying.'
      );
    }
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
            disabled={status === 'loading'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Top K (Optional)
          </label>
          <input
            type="number"
            min="1"
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="e.g., 5"
            value={topK}
            onChange={(e) => setTopK(e.target.value)}
            disabled={status === 'loading'}
          />
        </div>

        <button
          onClick={handleQuery}
          disabled={status === 'loading'}
          className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? 'Asking...' : 'Ask'}
        </button>

        <StatusAlert status={status} message={message} />

        {/* Generated Answer Display */}
        {answer && status !== 'loading' && (
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
