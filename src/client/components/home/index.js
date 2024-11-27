import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { QueryClient, QueryClientProvider } from "react-query";

import Content from './content';
import { currentTheme } from '../../theme';
import { RecentNetworksController } from '../recent-networks-controller';

import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';


const queryClient = new QueryClient();


export function Home({ recentNetworksController }) {
  const [ theme, setTheme ] = useState(currentTheme);

  useEffect(() => {
    // Listen for changes in the user's theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => setTheme(currentTheme());
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Content recentNetworksController={recentNetworksController} />
        </ThemeProvider>
      </StyledEngineProvider>
    </QueryClientProvider>
  );
}

Home.propTypes = {
  recentNetworksController: PropTypes.instanceOf(RecentNetworksController).isRequired,
};

export default Home;