import React, { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useDropzone } from 'react-dropzone';
import { ingestText, ingestPdf } from '../api/ingestionApi';
import { validateJson } from '../utils/validateJson';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`ingestion-tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const IngestionModal = ({ open, onClose }) => {
  const [tab, setTab] = useState(0);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const resetState = () => {
    setText('');
    setFile(null);
    setMetadata('');
    setStatus('idle');
    setMessage('');
  };

  const handleClose = () => {
    if (status === 'loading') return;
    resetState();
    onClose();
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    resetState();
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
      setMessage('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: status === 'loading',
  });

  const handleSubmit = async () => {
    const { isValid, parsed, error } = validateJson(metadata);
    if (!isValid) {
      setStatus('error');
      setMessage(`Metadata JSON is invalid: ${error}`);
      return;
    }

    if (tab === 0) { // Text
      if (!text.trim()) {
        setStatus('error');
        setMessage('Text content is required.');
        return;
      }
      setStatus('loading');
      try {
        await ingestText(text, parsed);
        setStatus('success');
        setMessage('Text successfully ingested!');
        setText('');
        setMetadata('');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || err.message || 'Error occurred');
      }
    } else { // PDF
      if (!file) {
        setStatus('error');
        setMessage('Please select a PDF file first.');
        return;
      }
      setStatus('loading');
      try {
        await ingestPdf(file, parsed);
        setStatus('success');
        setMessage(`File "${file.name}" successfully uploaded!`);
        setFile(null);
        setMetadata('');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || err.message || 'Error occurred');
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Knowledge to RAG</DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Text" />
          <Tab label="PDF File" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <TextField
            label="Text Content"
            multiline
            rows={6}
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={status === 'loading'}
            required
            sx={{ mb: 2 }}
          />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Box
            {...getRootProps()}
            sx={{
              border: 2,
              borderStyle: 'dashed',
              borderColor: isDragReject ? 'error.main' : isDragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
              mb: 2,
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon color={isDragReject ? 'error' : 'action'} sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body1">
              {isDragReject ? 'Only PDF files are accepted' : isDragActive ? 'Drop the PDF here...' : 'Drag & drop a PDF here, or click to select'}
            </Typography>
            <Typography variant="caption" color="text.secondary">Supports .pdf</Typography>
          </Box>
          {file && (
            <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'action.selected', borderRadius: 1, mb: 2 }}>
              <InsertDriveFileIcon color="primary" sx={{ mr: 2 }} />
              <Typography variant="body2" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TextField
          label="Metadata (Optional JSON)"
          multiline
          rows={2}
          fullWidth
          placeholder='{"source": "wiki", "author": "john"}'
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          disabled={status === 'loading'}
          sx={{ mb: 2, fontFamily: 'monospace' }}
        />

        {status === 'success' && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {status === 'error' && <Alert severity="error" sx={{ mb: 2 }}>{message}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={status === 'loading'}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={status === 'loading'} variant="contained" disableElevation>
          {status === 'loading' ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IngestionModal;
