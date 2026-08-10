import React, { createContext, useState, useMemo, useEffect, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('app-theme-mode');
    if (savedMode) return savedMode;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem('app-theme-mode', mode);
  }, [mode]);

  const toggleColorMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#2563eb', 
          },
          secondary: {
            main: '#4f46e5',
          },
          background: {
            default: mode === 'light' ? '#f9fafb' : '#0f172a', 
            paper: mode === 'light' ? '#ffffff' : '#1e293b',
          }
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        shape: {
          borderRadius: 12,
        },
      }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
