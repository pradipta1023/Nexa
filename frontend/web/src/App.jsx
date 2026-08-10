import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { useAppTheme } from './theme/ThemeContext';
import ProfileSelector from './components/ProfileSelector';
import EmptyState from './components/EmptyState';

const App = () => {
  const { mode, toggleColorMode } = useAppTheme();
  
  // State
  const [profile, setProfile] = useState(() => localStorage.getItem('rag-profile') || 'flash');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, streaming, success, error

  // Persist Profile
  useEffect(() => {
    localStorage.setItem('rag-profile', profile);
  }, [profile]);

  const handleNewChat = () => {
    setMessages([]);
    setStatus('idle');
    setInput('');
  };

  const handleExampleClick = (text) => {
    setInput(text);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            RAG AI
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ProfileSelector profile={profile} setProfile={setProfile} />
            
            <Button startIcon={<ChatBubbleOutlineIcon />} variant="outlined" size="small" color="inherit" onClick={handleNewChat}>
              New Chat
            </Button>
            <Button startIcon={<AddCircleOutlineIcon />} variant="contained" size="small" disableElevation>
              Add Knowledge
            </Button>
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Chat Area Placeholder */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="md" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 ? (
            <EmptyState onExampleClick={handleExampleClick} />
          ) : (
            <Typography variant="h6" color="text.secondary" align="center" sx={{ mt: 8, opacity: 0.5 }}>
              Chat history will render here...
            </Typography>
          )}
        </Container>
      </Box>

      {/* Input Area Placeholder */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
         <Container maxWidth="md">
            <Typography variant="body2" color="text.secondary" align="center">
              Input area coming soon... (Current Input: {input || 'None'})
            </Typography>
         </Container>
      </Box>
    </Box>
  );
};

export default App;
