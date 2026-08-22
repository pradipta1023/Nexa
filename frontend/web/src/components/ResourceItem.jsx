import React, { useState } from 'react';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import { knowledgeBaseApi } from '../api/knowledgeBaseApi';
import ResourceFormDialog from './ResourceFormDialog';

const getStatusColor = (status) => {
  switch (status) {
    case 'ready': return 'success';
    case 'processing': return 'info';
    case 'failed': return 'error';
    case 'pending':
    default: return 'warning';
  }
};

const ResourceItem = ({ kbId, resource, onRefresh, selected, onToggle }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(resource.name);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
      await knowledgeBaseApi.updateResourceMetadata(kbId, resource.id, { name: renameValue });
      setIsRenameDialogOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    try {
      await knowledgeBaseApi.deleteResource(kbId, resource.id);
      setIsDeleteDialogOpen(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <ListItem 
        disablePadding
        sx={{
          py: 0.5,
          pr: 4,
          '&:hover': { bgcolor: 'action.hover' },
          borderRadius: 1,
          position: 'relative'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Checkbox 
            size="small" 
            checked={selected}
            onChange={onToggle}
            sx={{ mr: 1 }}
          />
          <ListItemText 
            primary={resource.name}
            primaryTypographyProps={{ variant: 'body2', noWrap: true }}
            secondary={
              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                <Chip 
                  label={resource.status} 
                  size="small" 
                  color={getStatusColor(resource.status)} 
                  sx={{ height: 16, fontSize: '0.65rem' }} 
                />
                {resource.status === 'failed' && (
                  <Button 
                    size="small" 
                    color="primary" 
                    sx={{ minWidth: 'auto', p: 0, ml: 1, fontSize: '0.65rem', textTransform: 'none' }}
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    Retry
                  </Button>
                )}
              </Box>
            }
          />
        </Box>
        <IconButton 
          size="small" 
          sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
          onClick={handleMenuClick}
        >
          <MoreVertIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </ListItem>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { handleMenuClose(); setRenameValue(resource.name); setIsRenameDialogOpen(true); }}>
          Rename
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setIsEditDialogOpen(true); }}>
          Re-index / Replace
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setIsDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      <Dialog open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)}>
        <DialogTitle>Rename Resource</DialogTitle>
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
        <DialogTitle>Delete Resource</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{resource.name}</strong>? This action cannot be undone.
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
      
      <ResourceFormDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        kbId={kbId}
        type={resource.type}
        onRefresh={onRefresh}
        editingResource={resource}
      />
    </>
  );
};

export default ResourceItem;
