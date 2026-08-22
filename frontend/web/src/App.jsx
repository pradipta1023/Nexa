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
import CloseIcon from '@mui/icons-material/Close';
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
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useAppTheme } from './theme/ThemeContext';
import ProfileSelector from './components/ProfileSelector';
import EmptyState from './components/EmptyState';
import KnowledgeBaseSidebar from './components/KnowledgeBaseSidebar';
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
  const [isKBSidebarOpen, setIsKBSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deleteAnchorEl, setDeleteAnchorEl] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'all' or conversation.id
  const [selectedResourceIds, setSelectedResourceIds] = useState(new Set()); // Set of selected resource IDs
  const [mentionedResourceIds, setMentionedResourceIds] = useState(new Set()); // Set of resource IDs mentioned via #
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [resourcesByKb, setResourcesByKb] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch KBs and Resources on mount
  const fetchAllData = async () => {
    try {
      const { knowledgeBaseApi } = await import('./api/knowledgeBaseApi');
      const kbs = await knowledgeBaseApi.listKBs();
      setKnowledgeBases(kbs);

      const resourcesMap = {};
      await Promise.all(kbs.map(async (kb) => {
        const res = await knowledgeBaseApi.listResources(kb.id);
        resourcesMap[kb.id] = res;
      }));
      setResourcesByKb(resourcesMap);
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Failed to fetch KBs and resources:", error);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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

  const requestDelete = (event, target) => {
    setDeleteTarget(target);
    setDeleteAnchorEl(event.currentTarget);
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
    setDeleteAnchorEl(null);
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

    const resourceIdsArray = Array.from(selectedResourceIds);

    await queryDocsStream(
      textToSend,
      profile,
      conversationId,
      resourceIdsArray,
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

  const inputRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    
    // Look for `#` followed by any characters except `#` at the end of the string
    const match = val.match(/#([^#]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionAnchorEl(inputRef.current);
    } else {
      setMentionAnchorEl(null);
    }
  };

  const allResources = Object.values(resourcesByKb).flat();
  const filteredMentionResources = allResources.filter(r => 
    r.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleMentionSelect = (resource) => {
    // Add to mentioned
    setMentionedResourceIds(prev => new Set(prev).add(resource.id));
    // Also sync to sidebar selection
    setSelectedResourceIds(prev => new Set(prev).add(resource.id));
    
    // Remove the `#...` from the input
    setInput(prev => prev.replace(/#([^#]*)$/, ''));
    setMentionAnchorEl(null);
    inputRef.current?.focus();
  };

  const handleRemoveMention = (resourceId) => {
    setMentionedResourceIds(prev => {
      const next = new Set(prev);
      next.delete(resourceId);
      return next;
    });
    // Do we also unselect from sidebar? The user said "if user does # and selects... it should be checked...".
    // It's intuitive to uncheck it if they remove the chip, but let's just leave it checked in the sidebar or uncheck it. Let's uncheck it.
    setSelectedResourceIds(prev => {
      const next = new Set(prev);
      next.delete(resourceId);
      return next;
    });
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
            <Button startIcon={<AddCircleOutlineIcon />} variant="contained" size="small" disableElevation onClick={() => setIsKBSidebarOpen(true)}>
              Knowledge Bases
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
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>History</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                variant="text" 
                color="error" 
                onClick={(e) => requestDelete(e, 'all')} 
                disabled={conversations.length === 0}
                sx={{ minWidth: 0, px: 1, textTransform: 'none' }}
              >
                Clear All
              </Button>
            </Box>
          </Box>
          <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {conversations.map((c) => (
              <ListItem 
                key={c.id} 
                disablePadding
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" size="small" onClick={(e) => requestDelete(e, c.id)}>
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

      <KnowledgeBaseSidebar 
        open={isKBSidebarOpen} 
        onClose={() => setIsKBSidebarOpen(false)} 
        selectedResourceIds={selectedResourceIds}
        setSelectedResourceIds={setSelectedResourceIds}
        knowledgeBases={knowledgeBases}
        resourcesByKb={resourcesByKb}
        onRefresh={fetchAllData}
        loading={!isDataLoaded}
      />

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
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'background.paper', position: 'relative' }}>
         <Container maxWidth="md">
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={6}
              placeholder="Message RAG AI (type # to attach resources)..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !mentionAnchorEl) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              slotProps={{
                input: {
                  startAdornment: mentionedResourceIds.size > 0 && (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      {Array.from(mentionedResourceIds).map(id => {
                        const r = allResources.find(res => res.id === id);
                        if (!r) return null;
                        return (
                          <Box 
                            key={id} 
                            sx={{ 
                              bgcolor: 'primary.main', 
                              color: 'primary.contrastText',
                              px: 1, 
                              py: 0.5, 
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5
                            }}
                          >
                            #{r.name}
                            <IconButton 
                              size="small" 
                              onClick={() => handleRemoveMention(id)}
                              sx={{ p: 0, color: 'inherit', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                            >
                              <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 1 }}>
                      <ProfileSelector profile={profile} setProfile={setProfile} />
                      {status === 'streaming' || status === 'loading' ? (
                        <IconButton color="error" onClick={handleStop} edge="end" sx={{ mr: 0.5 }}>
                          <StopIcon />
                        </IconButton>
                      ) : (
                        <Tooltip title={selectedResourceIds.size === 0 ? "Please select at least one resource" : ""} placement="top">
                          <span>
                            <IconButton 
                              color="primary" 
                              onClick={handleSend} 
                              disabled={(!input.trim() && mentionedResourceIds.size === 0) || selectedResourceIds.size === 0} 
                              edge="end"
                              sx={{ mr: 0.5 }}
                            >
                              <SendIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 4, alignItems: 'center' }
                }
              }}
            />
         </Container>
      </Box>

      {/* Mention Popover */}
      <Popover
        open={Boolean(mentionAnchorEl)}
        anchorEl={mentionAnchorEl}
        onClose={() => setMentionAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        disableAutoFocus
        disableEnforceFocus
        PaperProps={{ sx: { width: mentionAnchorEl ? mentionAnchorEl.clientWidth : 300, maxHeight: 300, mb: 1, borderRadius: 2 } }}
      >
        <List disablePadding>
          {filteredMentionResources.length === 0 ? (
            <ListItem>
              <ListItemText primary="No matching resources found" secondary="Type to search..." />
            </ListItem>
          ) : (
            filteredMentionResources.map(r => (
              <ListItemButton key={r.id} onClick={() => handleMentionSelect(r)}>
                <ListItemText primary={r.name} secondary={r.type} />
              </ListItemButton>
            ))
          )}
        </List>
      </Popover>

      {/* Delete Confirmation Popover */}
      <Popover
        open={Boolean(deleteAnchorEl)}
        anchorEl={deleteAnchorEl}
        onClose={() => setDeleteAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { borderRadius: 4, mt: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } }}
      >
        <Box sx={{ minWidth: 300, maxWidth: 360, p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: '1.25rem' }}>
            Delete Chat
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.5 }}>
            Are you sure you want to delete {deleteTarget === 'all' ? 'all chat history' : 'this chat'}? This action cannot be undone.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setDeleteAnchorEl(null)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600, px: 2, py: 1 }}>
              Cancel
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained" disableElevation sx={{ textTransform: 'none', fontWeight: 600, px: 3, py: 1 }}>
              Delete
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default App;
