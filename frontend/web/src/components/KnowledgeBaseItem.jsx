import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
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
import ResourceList from './ResourceList';

const KnowledgeBaseItem = ({ kb, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Dialog states
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(kb.name);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    try {
      await knowledgeBaseApi.updateKB(kb.id, { name: renameValue });
      setIsRenameDialogOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    try {
      await knowledgeBaseApi.deleteKB(kb.id);
      setIsDeleteDialogOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <ListItem disablePadding sx={{ borderBottom: 1, borderColor: 'divider', display: 'block' }}>
        <ListItemButton onClick={() => setOpen(!open)} sx={{ pr: 6 }}>
          <ListItemText 
            primary={kb.name} 
            secondary={kb.description || 'No description'} 
            primaryTypographyProps={{ fontWeight: 500 }}
            secondaryTypographyProps={{ noWrap: true }}
          />
          {open ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <IconButton 
          size="small" 
          sx={{ position: 'absolute', right: 8, top: 12 }}
          onClick={handleMenuClick}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 2, pr: 2, pb: 2, bgcolor: 'background.default' }}>
            <ResourceList kbId={kb.id} summary={kb.resources} />
          </Box>
        </Collapse>
      </ListItem>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { handleMenuClose(); setRenameValue(kb.name); setIsRenameDialogOpen(true); }}>
          Rename
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setIsDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)}>
        <DialogTitle>Rename Knowledge Base</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRename} disabled={!renameValue.trim()}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Delete Knowledge Base</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{kb.name}</strong>? This will delete all its resources and cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default KnowledgeBaseItem;
