import React, { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ArticleIcon from '@mui/icons-material/Article';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LinkIcon from '@mui/icons-material/Link';
import Checkbox from '@mui/material/Checkbox';
import ResourceTypeSection from './ResourceTypeSection';

const ResourceList = ({ kbId, resources, onRefresh, selectedResourceIds, setSelectedResourceIds }) => {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const sections = [
    { type: 'text', icon: <ArticleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />, label: 'Text' },
    { type: 'pdf', icon: <PictureAsPdfIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />, label: 'PDF' },
    { type: 'link', icon: <LinkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />, label: 'Links' }
  ];

  return (
    <List disablePadding sx={{ mt: 1 }}>
      {sections.map((sec) => {
        const typeResources = resources.filter(r => r.type === sec.type);
        const count = typeResources.length;
        const isOpen = openSection === sec.type;

        const typeResourceIds = typeResources.map(r => r.id);
        const isAllSelected = typeResourceIds.length > 0 && typeResourceIds.every(id => selectedResourceIds.has(id));
        const isSomeSelected = typeResourceIds.some(id => selectedResourceIds.has(id));

        const handleToggleType = (e) => {
          e.stopPropagation();
          const newSelected = new Set(selectedResourceIds);
          if (isAllSelected) {
            typeResourceIds.forEach(id => newSelected.delete(id));
          } else {
            typeResourceIds.forEach(id => newSelected.add(id));
          }
          setSelectedResourceIds(newSelected);
        };

        return (
          <Box key={sec.type}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox 
                size="small"
                checked={isAllSelected}
                indeterminate={isSomeSelected && !isAllSelected}
                onChange={handleToggleType}
                disabled={typeResourceIds.length === 0}
                onClick={(e) => e.stopPropagation()}
              />
              <ListItemButton 
                onClick={() => toggleSection(sec.type)} 
                sx={{ py: 0.5, px: 1, borderRadius: 1, mb: 0.5, pl: 0 }}
              >
                {sec.icon}
                <ListItemText 
                  primary={`${sec.label} (${count})`} 
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} 
                />
                {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </ListItemButton>
            </Box>
            
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 3, pr: 1, pb: 1 }}>
                <ResourceTypeSection 
                  kbId={kbId} 
                  type={sec.type} 
                  resources={typeResources}
                  onRefresh={onRefresh}
                  selectedResourceIds={selectedResourceIds}
                  setSelectedResourceIds={setSelectedResourceIds}
                />
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </List>
  );
};

export default ResourceList;
