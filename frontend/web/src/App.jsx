import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useAppTheme } from './theme/ThemeContext';
import ProfileSelector from './components/ProfileSelector';
import EmptyState from './components/EmptyState';
import IngestionModal from './components/IngestionModal';
import MessageBubble from './components/MessageBubble';
import { queryDocsStream } from './api/queryApi';

const App = () => {
  const { mode, toggleColorMode } = useAppTheme();
  
  // State
  const [profile, setProfile] = useState(() => localStorage.getItem('rag-profile') || 'flash');
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [conversations, setConversations] = useState(() => JSON.parse(localStorage.getItem('rag-conversations')) || []);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, streaming, success, error
  const [isIngestionOpen, setIsIngestionOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'all' or conversation.id

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Persist Profile
  useEffect(() => {
    localStorage.setItem('rag-profile', profile);
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    
    setConversations(prev => {
      const existingIdx = prev.findIndex(c => c.id === conversationId);
      const title = prev[existingIdx]?.title || messages[0].content.slice(0, 30) + '...';
      
      const newConv = { id: conversationId, title, messages };
      
      let newConversations;
      if (existingIdx >= 0) {
        newConversations = [...prev];
        newConversations[existingIdx] = newConv;
      } else {
        newConversations = [newConv, ...prev];
      }
      
      localStorage.setItem('rag-conversations', JSON.stringify(newConversations));
      return newConversations;
    });
  }, [messages, conversationId]);

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setStatus('idle');
    setInput('');
    setConversationId(crypto.randomUUID());
    setIsSidebarOpen(false);
  };

  const requestDelete = (target) => {
    setDeleteTarget(target);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget === 'all') {
      setConversations([]);
      localStorage.removeItem('rag-conversations');
      handleNewChat();
    } else if (deleteTarget) {
      setConversations(prev => {
        const newConvs = prev.filter(c => c.id !== deleteTarget);
        localStorage.setItem('rag-conversations', JSON.stringify(newConvs));
        return newConvs;
      });
      if (conversationId === deleteTarget) {
        handleNewChat();
      }
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const loadConversation = (id) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setConversationId(id);
      setMessages(conv.messages);
      setStatus('idle');
      setIsSidebarOpen(false);
    }
  };

  const handleExampleClick = (text) => {
    setInput(text);
    handleSend(text);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('success');
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'ai') {
        newMessages[newMessages.length - 1].isStreaming = false;
      }
      return newMessages;
    });
  };

  const handleSend = async (overrideText = null) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : input;
    if (!textToSend.trim() || status === 'loading' || status === 'streaming') return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage, { role: 'ai', content: '', isStreaming: true }]);
    setInput('');
    setStatus('loading');

    abortControllerRef.current = new AbortController();

    await queryDocsStream(
      textToSend,
      profile,
      conversationId,
      (token) => {
        setStatus('streaming');
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: newMessages[lastIndex].content + token
          };
          return newMessages;
        });
      },
      () => {
        setStatus('success');
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex].isStreaming = false;
          return newMessages;
        });
        abortControllerRef.current = null;
      },
      (error) => {
        if (error.name === 'AbortError') return;
        
        setStatus('error');
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: newMessages[lastIndex].content + (newMessages[lastIndex].content ? '\n\n' : '') + `**Error:** ${error.message}`,
            isStreaming: false
          };
          return newMessages;
        });
        abortControllerRef.current = null;
      },
      abortControllerRef.current.signal
    );
  };

  const handleRegenerate = () => {
    let lastUserMsg = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsg = messages[i];
        break;
      }
    }
    
    if (lastUserMsg) {
      if (messages[messages.length - 1].role === 'ai') {
        setMessages(prev => prev.slice(0, prev.length - 1));
      }
      handleSend(lastUserMsg.content);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setIsSidebarOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            RAG AI
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            
            <Button startIcon={<ChatBubbleOutlineIcon />} variant="outlined" size="small" color="inherit" onClick={handleNewChat}>
              New Chat
            </Button>
            <Button startIcon={<AddCircleOutlineIcon />} variant="contained" size="small" disableElevation onClick={() => setIsIngestionOpen(true)}>
              Add Knowledge
            </Button>
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
        <Box sx={{ width: 280, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Chat History</Typography>
            <Box>
              <IconButton size="small" onClick={() => requestDelete('all')} disabled={conversations.length === 0} title="Clear All History">
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
              <Button size="small" variant="outlined" onClick={handleNewChat} sx={{ ml: 1 }}>New</Button>
            </Box>
          </Box>
          <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {conversations.map((c) => (
              <ListItem 
                key={c.id} 
                disablePadding
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" size="small" onClick={() => requestDelete(c.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton onClick={() => loadConversation(c.id)} selected={c.id === conversationId} sx={{ pr: 6 }}>
                  <ListItemText primary={c.title} primaryTypographyProps={{ noWrap: true }} />
                </ListItemButton>
              </ListItem>
            ))}
            {conversations.length === 0 && (
              <Typography variant="body2" color="text.secondary">No past conversations</Typography>
            )}
          </List>
        </Box>
      </Drawer>

      <IngestionModal open={isIngestionOpen} onClose={() => setIsIngestionOpen(false)} />

      {/* Main Chat Area */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth="md" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 ? (
            <EmptyState onExampleClick={handleExampleClick} />
          ) : (
            <Box sx={{ width: '100%', pb: 2 }}>
              {messages.map((msg, index) => (
                <MessageBubble 
                  key={index} 
                  message={msg} 
                  isLast={index === messages.length - 1} 
                  onRegenerate={handleRegenerate} 
                />
              ))}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Container>
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
         <Container maxWidth="md">
            <TextField
              fullWidth
              multiline
              maxRows={6}
              placeholder="Message RAG AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <ProfileSelector profile={profile} setProfile={setProfile} />
                      {status === 'streaming' || status === 'loading' ? (
                        <IconButton color="error" onClick={handleStop} edge="end" sx={{ mr: 0.5 }}>
                          <StopIcon />
                        </IconButton>
                      ) : (
                        <IconButton 
                          color="primary" 
                          onClick={handleSend} 
                          disabled={!input.trim()} 
                          edge="end"
                          sx={{ mr: 0.5 }}
                        >
                          <SendIcon />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 4 }
                }
              }}
            />
         </Container>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Chat</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteTarget === 'all' ? 'all chat history' : 'this chat'}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default App;
