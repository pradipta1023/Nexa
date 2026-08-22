import React, { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ResourceItem from './ResourceItem';
import ResourceFormDialog from './ResourceFormDialog';

const ResourceTypeSection = ({ kbId, type, resources, onRefresh, selectedResourceIds, setSelectedResourceIds }) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <Box>
      <List disablePadding>
        {resources.length === 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 1, pl: 1 }}>
            No {type} resources
          </Typography>
        ) : (
          resources.map(res => (
            <ResourceItem 
              key={res.id} 
              kbId={kbId} 
              resource={res} 
              onRefresh={onRefresh}
              selected={selectedResourceIds.has(res.id)}
              onToggle={() => {
                const newSelected = new Set(selectedResourceIds);
                if (newSelected.has(res.id)) {
                  newSelected.delete(res.id);
                } else {
                  newSelected.add(res.id);
                }
                setSelectedResourceIds(newSelected);
              }}
            />
          ))
        )}
      </List>
      <Button 
        startIcon={<AddIcon />} 
        size="small" 
        variant="text" 
        sx={{ mt: 1, textTransform: 'none' }}
        onClick={() => setIsAddDialogOpen(true)}
      >
        Add {type}
      </Button>
      <ResourceFormDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        kbId={kbId}
        type={type}
        onRefresh={onRefresh}
      />
    </Box>
  );
};

export default ResourceTypeSection;
