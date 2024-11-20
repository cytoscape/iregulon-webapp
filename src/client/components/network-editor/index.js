import React, { useState, useEffect, useReducer, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import Cytoscape from 'cytoscape';
import { QueryClient, QueryClientProvider } from "react-query";

import makeStyles from '@mui/styles/makeStyles';

import { BOTTOM_DRAWER_OPEN, DEFAULT_NETWORK_TYPE_SELECTION, DEFAULT_NETWORK_TOTAL_SELECTION } from '../defaults';
import { currentTheme } from '../../theme';
import { isMobile, isTablet } from '../util';
import { useUIStateStore, jsonToState } from './store';
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


/**
 * @param { NetworkEditorController } controller
 */
async function loadNetwork(id, cy, controller, recentNetworksController) {
  console.log('Loading...');

  const networkPromise = fetch(`/api/${id}`);
  const uiStatePromise = fetch(`/api/${id}/uistate`);

  const networkResult = await networkPromise;
  if (!networkResult.ok) {
    location.href = '/';
    return;
  }
  
  const results = await networkResult.json();

  cy.data({ 
    name: results.name, 
    parameters: results.parameters,
    demo: Boolean(results.demo)
  });

  // initializes the search controller
  controller.initializeResults(results); 

  const uiResult = await uiStatePromise;
  let stateJson;
  if(uiResult.ok) {
    stateJson = await uiResult.json();
  }

  if(stateJson) {
    restoreUIStateAndNetwork(stateJson, controller);
  }
  if(cy.nodes().length === 0) {
    initializeNetworkWithTopClusters(cy, controller);
  } 
  if(stateJson) {
    restorePositions(stateJson, controller);
  }

  // Set network style
  const style = createNetworkStyle(cy);
  cy.style().fromJson(style.cyJSON);
  controller.style = style; // Make available to components

  const updateServerState   = _.debounce(() => controller.savePositionsAndState(), 4000);
  const updateRecentNetwork = _.debounce(() => recentNetworksController.updateRecentNetwork(cy), 1000);
  // same debounced function "updateServerState" used for both events so it doesn't get called twice
  cy.on('position remove', 'node', updateRecentNetwork);
  cy.on('position remove', 'node', updateServerState);
  useUIStateStore.subscribe(state => state.selectedTFs, () => { console.log("zustand event"); updateServerState(); });   // TODO should this be fired on the event bus instead??

  // Make sure to call cy.fit() after the network is ready
  cy.ready(() => {
    controller.fitAndSetZoomMinMax();
    recentNetworksController.saveRecentNetwork(cy);
  });

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
  cy.data({ loaded: true });
  controller.bus.emit('networkLoaded', { cy, results }); 
  console.log('Successful Network Load');

  // make the controller accessible from the console for debugging purposes
  window.controller = controller;
}


/**
 * Must be called after the cy object is created and the search controller is initialized.
 */
function initializeNetworkWithTopClusters(cy, controller) {
  // If the loaded network is empty (no nodes), then update it with the top clusters
  console.log('Network is empty, initialize with top clusters...');
  // Get the top clusters
  const results = controller.fetchResults(DEFAULT_NETWORK_TYPE_SELECTION);
  const maxResults = Math.min(results.length, DEFAULT_NETWORK_TOTAL_SELECTION);

  let count = 0;
  const filteredResults = results
    .filter(ele => { 
      if (ele.transcriptionFactors.length > 0 && count < maxResults) {
        ++count;
        return true;
      }
      return false;
    })
    .map(ele => _.cloneDeep(ele));

  filteredResults.forEach(ele => {
    // Add only the first TF by default
    ele.transcriptionFactors = ele.transcriptionFactors.slice(0, 1);
    // Update the UI Store
    const tf = ele.transcriptionFactors[0];
    const id = ele.id;
    useUIStateStore.getState().setSelectedTF(id, tf.geneID.name, true);
  });

  // TODO do not add to network here (?), but let the data-table do it from the cheked results (TF's 'inNetwork' field)
  controller.addToNetwork(filteredResults);
  controller.applyLayout();
}


function restoreUIStateAndNetwork(stateJson, controller) {
  const { state } = stateJson;
  if(state) {
    console.log('got UI state from server');
    try {
      const stateObj = jsonToState(state);
      console.log('UI state', stateObj);

      useUIStateStore.setState(stateObj);

      const { selectedTFs } = stateObj;
      const results = controller.fetchResults();

      const filteredResults = results
        .filter(result => selectedTFs.has(result.id))
        .map(result => _.cloneDeep(result))
        .map(result => {
          const filteredTFs = result.transcriptionFactors
            .filter(tf => selectedTFs.get(result.id).has(tf.geneID.name));
          result.transcriptionFactors = filteredTFs;
          return result;
        });

      console.log("adding to network", filteredResults);
      controller.addToNetwork(filteredResults);
    } catch (e) {
      console.error('Error restoring UI state:', state, e);
    }
  } else {
    console.error('Error restoring UI state:', state);
  }
}


function restorePositions(stateJson, controller) {
  const { positions } = stateJson;
  if(positions) {
    console.log('got positions from server');
    controller.applyPositions(positions);
  } else {
    controller.applyLayout();
  }
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
    return () => {
      cy.destroy();
    };
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