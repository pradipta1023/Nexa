import React from 'react';

const StatusAlert = ({ status, message }) => {
  if (!status || status === 'idle' || !message) {
    return null;
  }

  const getAlertStyles = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={`mt-4 p-4 rounded-md border ${getAlertStyles()} flex items-center justify-between transition-all duration-300`}>
      <p className="text-sm font-medium whitespace-pre-wrap">{message}</p>
      
      {status === 'loading' && (
        <svg 
          className="animate-spin h-5 w-5 text-blue-700 ml-3 shrink-0" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
    </div>
  );
};

export default StatusAlert;
