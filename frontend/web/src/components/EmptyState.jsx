import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const EmptyState = ({ onExampleClick }) => {
  const examples = [
    "What is Retrieval-Augmented Generation (RAG)?",
    "Explain the architecture of a modern web application.",
    "What are the main differences between SQL and NoSQL?",
    "Can you summarize the key benefits of using React?"
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, mt: 8 }}>
      <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'action.hover', mb: 2 }}>
        <AutoAwesomeIcon sx={{ fontSize: 48, color: 'primary.main' }} />
      </Box>
      <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
        How can I help you today?
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Ask a question about your documents to get started.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, maxWidth: 700, width: '100%' }}>
        {examples.map((example, idx) => (
          <Button 
            key={idx} 
            variant="outlined" 
            color="inherit" 
            sx={{ 
              p: 2, 
              textAlign: 'left', 
              justifyContent: 'flex-start', 
              alignItems: 'flex-start',
              borderRadius: 3, 
              textTransform: 'none', 
              color: 'text.secondary',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
            onClick={() => onExampleClick(example)}
          >
            {example}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default EmptyState;
