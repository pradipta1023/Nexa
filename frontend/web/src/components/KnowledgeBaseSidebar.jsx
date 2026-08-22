import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import List from '@mui/material/List';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { knowledgeBaseApi } from '../api/knowledgeBaseApi';
import KnowledgeBaseItem from './KnowledgeBaseItem';

const KnowledgeBaseSidebar = ({ 
  open, 
  onClose, 
  selectedResourceIds, 
  setSelectedResourceIds,
  knowledgeBases,
  resourcesByKb,
  onRefresh,
  loading
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDescription, setNewKbDescription] = useState('');

  const handleCreateKB = async () => {
    if (!newKbName.trim()) return;
    try {
      await knowledgeBaseApi.createKB({ name: newKbName, description: newKbDescription });
      setNewKbName('');
      setNewKbDescription('');
      setIsCreateDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error("Failed to create KB:", error);
    }
  };

  const allResourceIds = Object.values(resourcesByKb).flat().map(r => r.id);
  const isAllSelected = allResourceIds.length > 0 && allResourceIds.every(id => selectedResourceIds.has(id));
  const isSomeSelected = allResourceIds.some(id => selectedResourceIds.has(id));

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedResourceIds(new Set());
    } else {
      setSelectedResourceIds(new Set(allResourceIds));
    }
  };

  return (
    <>
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 350 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title={isAllSelected ? "Unselect All" : "Select All"}>
                <Checkbox 
                  size="small" 
                  checked={isAllSelected}
                  indeterminate={isSomeSelected && !isAllSelected}
                  onChange={handleToggleAll}
                  disabled={allResourceIds.length === 0}
                />
              </Tooltip>
              <Typography variant="h6" sx={{ fontWeight: 'bold', ml: 1 }}>Knowledge Bases</Typography>
            </Box>
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
              <KnowledgeBaseItem 
                key={kb.id} 
                kb={kb} 
                resources={resourcesByKb[kb.id] || []}
                onRefresh={onRefresh} 
                selectedResourceIds={selectedResourceIds}
                setSelectedResourceIds={setSelectedResourceIds}
              />
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
