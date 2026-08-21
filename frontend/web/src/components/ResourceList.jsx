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
import ResourceTypeSection from './ResourceTypeSection';

const ResourceList = ({ kbId, summary }) => {
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
        const count = summary?.[sec.type] || 0;
        const isOpen = openSection === sec.type;

        return (
          <Box key={sec.type}>
            <ListItemButton 
              onClick={() => toggleSection(sec.type)} 
              sx={{ py: 0.5, px: 1, borderRadius: 1, mb: 0.5 }}
            >
              {sec.icon}
              <ListItemText 
                primary={`${sec.label} (${count})`} 
                primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} 
              />
              {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
            
            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ pl: 3, pr: 1, pb: 1 }}>
                <ResourceTypeSection kbId={kbId} type={sec.type} />
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </List>
  );
};

export default ResourceList;
