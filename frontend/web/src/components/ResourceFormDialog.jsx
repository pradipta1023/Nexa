import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { knowledgeBaseApi } from '../api/knowledgeBaseApi';
import { ingestText, ingestPdf } from '../api/ingestionApi';

const ResourceFormDialog = ({ open, onClose, kbId, type, onRefresh, editingResource }) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState(''); // Text content or link URL
  const [file, setFile] = useState(null); // PDF file
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && editingResource) {
      setName(editingResource.name);
      // We don't fetch existing text content because the backend doesn't store the raw text, only chunks.
      // So replacing a resource requires providing the text/file again.
    } else if (open) {
      resetForm();
    }
  }, [open, editingResource]);

  const resetForm = () => {
    setName('');
    setContent('');
    setFile(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      let currentResourceId;
      
      if (editingResource) {
        currentResourceId = editingResource.id;
        if (name !== editingResource.name) {
          await knowledgeBaseApi.updateResourceMetadata(kbId, currentResourceId, { name });
        }
      } else {
        const resource = await knowledgeBaseApi.createResource(kbId, {
          name,
          type
        });
        currentResourceId = resource.id;
      }

      // 2. Ingest the content
      if (type === 'text') {
        await ingestText(kbId, currentResourceId, content, {});
      } else if (type === 'pdf') {
        await ingestPdf(kbId, currentResourceId, file, {});
      } else if (type === 'link') {
        throw new Error("Link ingestion route is not yet implemented on the backend.");
      }

      handleClose();
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      setError(e.message || "An error occurred during ingestion.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (!name.trim()) return false;
    if (type === 'text' && !content.trim()) return false;
    if (type === 'pdf' && !file) return false;
    if (type === 'link' && !content.trim()) return false;
    return true;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add {type.charAt(0).toUpperCase() + type.slice(1)} Resource</DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <TextField
          autoFocus
          margin="dense"
          label="Resource Name"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
          disabled={loading}
        />

        {type === 'text' && (
          <TextField
            margin="dense"
            label="Text Content"
            fullWidth
            variant="outlined"
            multiline
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          />
        )}

        {type === 'link' && (
          <TextField
            margin="dense"
            label="URL"
            fullWidth
            variant="outlined"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          />
        )}

        {type === 'pdf' && (
          <Box sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              component="label"
              disabled={loading}
              fullWidth
            >
              {file ? file.name : "Select PDF File"}
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={!isFormValid() || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Ingesting...' : 'Ingest'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResourceFormDialog;
