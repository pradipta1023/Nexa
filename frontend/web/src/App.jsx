import React from 'react';
import TextIngestionCard from './components/TextIngestionCard';
import PdfIngestionCard from './components/PdfIngestionCard';
import QueryCard from './components/QueryCard';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-800">RAG Pipeline Dashboard</h1>
        
        <div className="flex flex-col space-y-8">
          <TextIngestionCard />
          <PdfIngestionCard />
          <QueryCard />
        </div>
      </div>
    </div>
  );
};

export default App;
