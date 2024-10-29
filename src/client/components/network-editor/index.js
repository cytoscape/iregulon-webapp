import React, { useState, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import Cytoscape from 'cytoscape';
import { QueryClient, QueryClientProvider } from "react-query";

import makeStyles from '@mui/styles/makeStyles';

import { BOTTOM_DRAWER_OPEN } from '../defaults';
import { currentTheme } from '../../theme';
import { isMobile, isTablet } from '../util';
import { NetworkEditorController } from './controller';
import Main from './main';

import createNetworkStyle from './network-style';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { RecentNetworksController } from '../recent-networks-controller';


const useStyles = makeStyles(() => ({
  root: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    // Disable Text Selection:
    WebkitTouchCallout: 'none', /* iOS Safari */
    WebkitUserSelect: 'none', /* Safari */
    MozUserSelect: 'none', /* Firefox */
    msUserSelect: 'none', /* Internet Explorer/Edge */
    userSelect: 'none', /* Non-prefixed version (Chrome and Opera) */
    // -----------------------
  },
}));


const queryClient = new QueryClient();


function createCy(id) {
  console.log(`createCy(${id})`);

  const cy = new Cytoscape({
    headless: true,
    styleEnabled: true,
    boxSelectionEnabled: true,
    selectionType: 'single',
  });
  cy.data({ id });
  return cy;
}


function getInitialResults(results) {
  // For now, just update the network with the top results
  // NOTE: there are no 'CLUSTER' results in the results object
  const maxResults = Math.min(results.length, 4);

  const filteredResults = [];
  for(const ele of results) {
    if(ele.transcriptionFactors.length > 0) {
      filteredResults.push(ele);
    } 
    if(filteredResults.length >= maxResults) {
      break;
    }
  }
  return filteredResults;
}

function getSavedResults(results, selected) {
  return results.filter(result => 
    selected.some(({ type, name }) => type === result.type && name === result.name)
  );
}


/**
 * @param { NetworkEditorController } controller
 */
async function loadNetwork(id, cy, controller, recentNetworksController) {
  console.log('Loading...');

  const networkPromise = fetch(`/api/${id}`);
  const positionsAndStatePromise = fetch(`/api/${id}/positions`);

  const networkResult = await networkPromise;
  if (!networkResult.ok) {
    location.href = '/';
    return;
  }
  const networkJson = await networkResult.json();
  console.log(networkJson);

  // cy.add(networkJson.network.elements);
  cy.data({ 
    name: networkJson.networkName || networkJson.name, 
    demo: Boolean(networkJson.demo)
  });

  // Set network style
  const style = createNetworkStyle(cy);
  cy.style().fromJson(style.cyJSON);
  controller.style = style; // Make available to components

  controller.initializeResults(networkJson);

  const positionsResult = await positionsAndStatePromise;

  // Apply layout and select rows in the table
  if (positionsResult.status == 404) {
    console.log('no positions and state found on server, initializing');
    const filteredResults = getInitialResults(networkJson.results); 
    controller.updateNetwork(filteredResults, networkJson.genes);
    await controller.applyLayout();
  } else {
    console.log('got positions and state from server');
    const positionsJson = await positionsResult.json();
    const { positions, selected } = positionsJson;
    const allResults = controller.fetchResults();
    const filteredResults = getSavedResults(allResults, selected);
    controller.updateNetwork(filteredResults, networkJson.genes);
    controller.applyPositions(positions);
  }

  // Make sure to call cy.fit() after the network is ready
  cy.ready(() => {
    controller.fitAndSetZoomMinMax();
    recentNetworksController.saveRecentNetwork(cy);
  });

  const updateServerState   = _.debounce(() => controller.savePositionsAndState(), 4000);
  const updateRecentNetwork = _.debounce(() => recentNetworksController.updateRecentNetwork(cy), 1000);
  
  cy.on('position remove', 'node', updateRecentNetwork);
  // same debounced function "updateServerState" used for both events, makes sure it doesn't get called twice
  cy.on('position remove', 'node', updateServerState);
  controller.bus.on('selectedResultsChanged', updateServerState); 

  // Selecting an edge should select its nodes, but the edge itself must never be selected
  // (this makes it easier to keep the data table selection consistent)
  // TODO: Does this still make sense?
  cy.edges().on('select', evt => {
    const edge = evt.target;
    edge.source().select();
    edge.target().select();
    edge.unselect();
  });

  // Notify listeners that the network has been loaded
  console.log('Loaded');
  cy.data({ loaded: true });
  controller.bus.emit('networkLoaded'); 

  console.log('Successful Network Load');

  // make the controller accessible from the chrome console for debugging purposes
  window.controller = controller;
}


function Root({ id, theme, recentNetworksController }) {
  const [ cy ] = useState(() => createCy(id));
  const [ controller ] = useState(() => new NetworkEditorController(cy));
  const [ mobile, setMobile ] = useState(() => isMobile(theme));
  const [ tablet, setTablet ] = useState(() => isTablet(theme));
  const [ openLeftDrawer, setOpenLeftDrawer ] = useState(() => !isMobile(theme) && !isTablet(theme));
  const [ openRightDrawer, setOpenRightDrawer ] = useState(false);
  const [ openBottomDrawer, setOpenBottomDrawer ] = useState(BOTTOM_DRAWER_OPEN);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  const bottomDrawerOpenRef = useRef(BOTTOM_DRAWER_OPEN);
  bottomDrawerOpenRef.current = openBottomDrawer;

  const classes = useStyles();

  const handleResize = () => {
    setMobile(isMobile(theme));
    setTablet(isTablet(theme));
    if (!isMobile(theme)) { // Close the mobile menu
      setOpenRightDrawer(false);
    }
    if (bottomDrawerOpenRef.current) { // Prevents unnecessary re-rendering!
      forceUpdate(); // Because of the bottom drawer height, which can vary depending on the screen size
    }
  };
  const debouncedHandleResize = _.debounce(() => handleResize(), 100);

  const onCloseLeftDrawer = () => {
    setOpenLeftDrawer(false);
  };
  const onCloseRightDrawer = () => {
    setOpenRightDrawer(false);
  };
  const onOpenLeftDrawer = () => {
    setOpenLeftDrawer(true);
  };
  const onOpenRightDrawer = () => {
    setOpenRightDrawer(true);
  };
  const onToggleBottomDrawer = (open) => {
    setOpenBottomDrawer(open);
  };

  const maybeCloseDrawers = () => {
    setOpenRightDrawer(false);
    if (mobile || tablet) {
      setOpenLeftDrawer(false);
    }
  };

  useEffect(() => {
    loadNetwork(id, cy, controller, recentNetworksController);
    return () => cy.destroy();
  }, []);

  useEffect(() => {
    window.addEventListener('resize', debouncedHandleResize);
    return () => {
      debouncedHandleResize.cancel();
      window.removeEventListener('resize', debouncedHandleResize);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        maybeCloseDrawers();
      }
    };
    document.addEventListener('keydown', onKeyDown, false);
    return () => document.removeEventListener('keydown', onKeyDown, false);
  }, []);

  useEffect(() => {
    const onSelect = () => setOpenLeftDrawer(!isMobile(theme) && !isTablet(theme));
    cy.on('select', onSelect);
    return () => cy.removeListener('select', onSelect);
  }, []);

  return (
    <div className={classes.root}>
      <svg id="svg_point_factory" style={{ position:'absolute', pointerEvents:'none'}}/>
      <Main
        controller={controller}
        openLeftDrawer={openLeftDrawer}
        openRightDrawer={openRightDrawer}
        openBottomDrawer={openBottomDrawer}
        isMobile={mobile}
        isTablet={tablet}
        onCloseLeftDrawer={onCloseLeftDrawer}
        onCloseRightDrawer={onCloseRightDrawer}
        onOpenLeftDrawer={onOpenLeftDrawer}
        onOpenRightDrawer={onOpenRightDrawer}
        onToggleBottomDrawer={onToggleBottomDrawer}
      />
    </div>
  );
}
Root.propTypes = {
  id: PropTypes.string,
  theme: PropTypes.object.isRequired,
  recentNetworksController: PropTypes.instanceOf(RecentNetworksController).isRequired,
};

export function NetworkEditor({ id, recentNetworksController }) {
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
          <Root id={id} theme={theme} recentNetworksController={recentNetworksController} />
        </ThemeProvider>
      </StyledEngineProvider>
    </QueryClientProvider>
  );
}
NetworkEditor.propTypes = {
  id: PropTypes.string,
  recentNetworksController: PropTypes.instanceOf(RecentNetworksController).isRequired,
};


export function Demo() {
  return <NetworkEditor id="demo" secret="demo" />;
}


export default NetworkEditor;