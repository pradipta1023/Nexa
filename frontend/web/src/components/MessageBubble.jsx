import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReplayIcon from '@mui/icons-material/Replay';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CircularProgress from '@mui/material/CircularProgress';
import { useAppTheme } from '../theme/ThemeContext';

const MessageBubble = ({ message, onRegenerate, isLast }) => {
  const { mode } = useAppTheme();
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 4, width: '100%' }}>
      <Avatar sx={{ bgcolor: isUser ? 'primary.main' : 'secondary.main', width: 36, height: 36, mt: 0.5 }}>
        {isUser ? <PersonIcon /> : <SmartToyIcon />}
      </Avatar>
      
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 'bold' }}>
          {isUser ? 'You' : 'RAG AI'}
        </Typography>
        
        <Box 
          sx={{ 
            typography: 'body1',
            color: 'text.primary',
            '& pre': {
              bgcolor: mode === 'dark' ? '#1e293b' : '#f1f5f9',
              p: 2,
              borderRadius: 2,
              overflowX: 'auto',
              border: 1,
              borderColor: 'divider',
            },
            '& code': {
              fontFamily: 'monospace',
              bgcolor: mode === 'dark' ? '#334155' : '#e2e8f0',
              px: 0.5,
              py: 0.25,
              borderRadius: 1,
            },
            '& pre code': {
              bgcolor: 'transparent',
              px: 0,
              py: 0,
            },
            '& p': { mt: 0, mb: 1.5 },
            '& p:last-child': { mb: 0 },
            '& a': { color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
            '& ul, & ol': { mt: 0, mb: 1.5, pl: 3 },
            '& h1, & h2, & h3, & h4': { mt: 3, mb: 1.5, fontWeight: 'bold' },
            '& h1': { fontSize: '1.5rem' },
            '& h2': { fontSize: '1.25rem' },
            '& h3': { fontSize: '1.1rem' },
            '& blockquote': {
              borderLeft: 4,
              borderColor: 'divider',
              pl: 2,
              ml: 0,
              my: 1.5,
              color: 'text.secondary',
              fontStyle: 'italic'
            }
          }}
        >
          {isUser ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          ) : (
            <>
              {message.content === '' && message.isStreaming && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1, color: 'text.secondary' }}>
                  <CircularProgress size={16} color="inherit" thickness={5} />
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    Thinking...
                  </Typography>
                </Box>
              )}
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </>
          )}
        </Box>

        {/* Actions for AI responses */}
        {!isUser && !message.isStreaming && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <IconButton size="small" onClick={handleCopy} aria-label="Copy message" sx={{ color: 'text.secondary' }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
            {isLast && onRegenerate && (
              <IconButton size="small" onClick={onRegenerate} aria-label="Regenerate message" sx={{ color: 'text.secondary' }}>
                <ReplayIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MessageBubble;
