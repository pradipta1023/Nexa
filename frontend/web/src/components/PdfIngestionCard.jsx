import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ingestPdf } from '../api/ingestionApi';
import { validateJson } from '../utils/validateJson';
import StatusAlert from './StatusAlert';

const PdfIngestionCard = () => {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
      setMessage('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: status === 'loading',
  });

  const handleUpload = async () => {
    if (!file) {
      setStatus('error');
      setMessage('Please select a PDF file first.');
      return;
    }

    const { isValid, parsed, error } = validateJson(metadata);
    if (!isValid) {
      setStatus('error');
      setMessage(`Metadata JSON is invalid: ${error}`);
      return;
    }

    setStatus('loading');
    setMessage('Uploading PDF...');

    try {
      await ingestPdf(file, parsed);
      setStatus('success');
      setMessage(`File "${file.name}" successfully uploaded!`);
      setFile(null);
      setMetadata('');
    } catch (err) {
      setStatus('error');
      setMessage(
        err.response?.data?.message || 
        err.response?.data?.error || 
        err.message || 
        'An error occurred during upload.'
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">PDF Ingestion</h2>
      
      <div className="space-y-4">
        {/* Dropzone Area */}
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            status === 'loading' 
              ? 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-60' 
              : isDragReject
                ? 'border-red-500 bg-red-50'
                : isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <svg className={`w-10 h-10 ${isDragReject ? 'text-red-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p className="text-sm font-medium text-gray-600">
              {isDragReject ? 'Only PDF files are accepted' : isDragActive ? 'Drop the PDF here...' : 'Drag & drop a PDF here, or click to select'}
            </p>
            <p className="text-xs text-gray-500">Supports .pdf</p>
          </div>
        </div>

        {/* Selected File Details */}
        {file && (
          <div className="flex items-center justify-between bg-blue-50 text-blue-800 px-4 py-3 rounded-md border border-blue-100 text-sm">
            <div className="flex items-center space-x-2 truncate">
              <svg className="w-5 h-5 shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path>
              </svg>
              <span className="font-medium truncate">{file.name}</span>
            </div>
            <span className="shrink-0 ml-4 font-medium opacity-80">{formatFileSize(file.size)}</span>
          </div>
        )}

        {/* Metadata Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metadata (Optional JSON)
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y"
            rows="3"
            placeholder='{"category": "report", "year": 2024}'
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            disabled={status === 'loading'}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleUpload}
          disabled={status === 'loading' || !file}
          className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading' ? 'Uploading...' : 'Upload PDF'}
        </button>

        <StatusAlert status={status} message={message} />
      </div>
    </div>
  );
};

export default PdfIngestionCard;
