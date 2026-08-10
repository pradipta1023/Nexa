import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import BoltIcon from '@mui/icons-material/Bolt';
import PsychologyIcon from '@mui/icons-material/Psychology';

const ProfileSelector = ({ profile, setProfile }) => {
  const handleChange = (event, newProfile) => {
    if (newProfile !== null) {
      setProfile(newProfile);
    }
  };

  return (
    <ToggleButtonGroup
      color="primary"
      value={profile}
      exclusive
      onChange={handleChange}
      aria-label="Profile"
      size="small"
      sx={{ height: 36 }}
    >
      <ToggleButton value="flash" aria-label="Flash" sx={{ px: 2, textTransform: 'none', fontWeight: 500 }}>
        <BoltIcon fontSize="small" sx={{ mr: 0.5 }} /> Flash
      </ToggleButton>
      <ToggleButton value="thinking" aria-label="Thinking" sx={{ px: 2, textTransform: 'none', fontWeight: 500 }}>
        <PsychologyIcon fontSize="small" sx={{ mr: 0.5 }} /> Thinking
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default ProfileSelector;
