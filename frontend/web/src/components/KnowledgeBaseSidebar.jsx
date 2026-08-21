import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { knowledgeBaseApi } from '../api/knowledgeBaseApi';
import KnowledgeBaseItem from './KnowledgeBaseItem';

const KnowledgeBaseSidebar = ({ open, onClose }) => {
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDescription, setNewKbDescription] = useState('');

  const fetchKBs = async () => {
    try {
      setLoading(true);
      const data = await knowledgeBaseApi.listKBs();
      setKnowledgeBases(data);
    } catch (error) {
      console.error("Failed to fetch Knowledge Bases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchKBs();
    }
  }, [open]);

  const handleCreateKB = async () => {
    if (!newKbName.trim()) return;
    try {
      await knowledgeBaseApi.createKB({ name: newKbName, description: newKbDescription });
      setNewKbName('');
      setNewKbDescription('');
      setIsCreateDialogOpen(false);
      fetchKBs();
    } catch (error) {
      console.error("Failed to create KB:", error);
    }
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 350 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Knowledge Bases</Typography>
            <Box>
              <IconButton size="small" onClick={() => setIsCreateDialogOpen(true)} color="primary" sx={{ mr: 1 }}>
                <AddIcon />
              </IconButton>
              <IconButton size="small" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <List sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
            {knowledgeBases.length === 0 && !loading && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No Knowledge Bases found.</Typography>
              </Box>
            )}
            {knowledgeBases.map((kb) => (
              <KnowledgeBaseItem key={kb.id} kb={kb} onRefresh={fetchKBs} />
            ))}
          </List>
        </Box>
      </Drawer>

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Knowledge Base</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={newKbName}
            onChange={(e) => setNewKbName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newKbDescription}
            onChange={(e) => setNewKbDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateKB} disabled={!newKbName.trim()}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default KnowledgeBaseSidebar;
