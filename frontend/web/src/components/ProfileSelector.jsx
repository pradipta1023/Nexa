import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import BoltIcon from '@mui/icons-material/Bolt';
import PsychologyIcon from '@mui/icons-material/Psychology';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const ProfileSelector = ({ profile, setProfile }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = (newProfile) => {
    setAnchorEl(null);
    if (newProfile) setProfile(newProfile);
  };

  const isFlash = profile === 'flash';

  return (
    <>
      <Button
        variant="text"
        size="small"
        onClick={handleClick}
        endIcon={<KeyboardArrowDownIcon sx={{ ml: -0.5 }} />}
        sx={{ 
          textTransform: 'none', 
          color: 'text.secondary',
          borderRadius: 2,
          px: 1,
          mr: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        {isFlash ? <BoltIcon fontSize="small" sx={{ mr: 0.5 }} /> : <PsychologyIcon fontSize="small" sx={{ mr: 0.5 }} />}
        {isFlash ? 'Flash' : 'Thinking'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => handleClose(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        PaperProps={{
          elevation: 3,
          sx: { mt: -1, borderRadius: 2, minWidth: 150 }
        }}
      >
        <MenuItem onClick={() => handleClose('flash')} selected={profile === 'flash'}>
          <BoltIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> Flash
        </MenuItem>
        <MenuItem onClick={() => handleClose('thinking')} selected={profile === 'thinking'}>
          <PsychologyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> Thinking
        </MenuItem>
      </Menu>
    </>
  );
};

export default ProfileSelector;
