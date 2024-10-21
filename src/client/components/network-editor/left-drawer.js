import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

import { HEADER_HEIGHT, LEFT_DRAWER_WIDTH } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import GeneListPanel from './gene-list-panel';

import makeStyles from '@mui/styles/makeStyles';

import { Drawer, Grid, IconButton, Typography, Toolbar, Tooltip } from '@mui/material';
import SearchBar from './search-bar';

import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import CloseIcon from '@mui/icons-material/Close';
import { DownloadIcon } from '../svg-icons';


const filterQueryGenes = true;

const sortOptions = {
  up: {
    label: 'Sort by RANK (from lowest to highest)',
    icon: <Typography>DOWN</Typography>,
    iteratees: ['rank', 'name'],
    orders: ['asc', 'asc']
  },
  down: {
    label: 'Sort by RANK (from highest to lowest)',
    icon: <Typography>UP</Typography>,
    iteratees: ['rank', 'name'],
    orders: ['desc', 'asc']
  },
};

const useStyles = makeStyles((theme) => ({
  root: {
    background: theme.palette.background.default,
    width: LEFT_DRAWER_WIDTH,
    flexShrink: 0,
    display: 'flex',
    flexFlow: 'column',
    height: '100%',
    // Disable Text Selection (needed here as well because the Drawer can be 'temporary', rendered as a Dialog):
    WebkitTouchCallout: 'none', /* iOS Safari */
    WebkitUserSelect: 'none', /* Safari */
    MozUserSelect: 'none', /* Firefox */
    msUserSelect: 'none', /* Internet Explorer/Edge */
    userSelect: 'none', /* Non-prefixed version (Chrome and Opera) */
    // -----------------------
  },
  paper: {
    width: LEFT_DRAWER_WIDTH,
    background: theme.palette.background.default,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
  header: {
    flex: '0 1 auto',
  },
  controls: {
    padding: theme.spacing(1),
  },
  controlsRow2: {
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
  },
  content: {
    flex: '1 1 auto',
    overflowY: 'auto',
    borderColor: theme.palette.divider,
    borderWidth: '1px',
    borderStyle: 'solid solid hidden hidden',
    borderRadius: 4,
  },
  toolbar: {
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(0.5),
    minHeight: HEADER_HEIGHT + 1,
    backgroundColor: theme.palette.background.header,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  title: {
    paddingLeft: theme.spacing(0.5),
  },
  grow: {
    flexGrow: 1,
  },
  closeButton: {
    width: 41,
    height: 41,
  },
  setOperationSelect: {
    height: 40,
    width: 77,
    color: theme.palette.text.secondary,
  },
  setOperationIcon: {
    minWidth: 48,
    color: theme.palette.text.secondary,
  },
  sortButton: {
    width: 77,
  },
  geneList: {
    overflowY: "auto",
  },
}));

const LeftDrawer = ({ controller, open, isMobile, isTablet, onClose }) => {
  const [networkLoaded, setNetworkLoaded] = useState(false);
  const [geneListIndexed, setGeneListIndexed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [genes, setGenes] = useState(null);
  const [sort, setSort] = useState('down');
  const [selectedGene, setSelectedGene] = useState(null);
  const [initialIndex, setInitialIndex] = useState(-1); // -1 means "do NOT change the scroll position"

  const searchValueRef = useRef();
  searchValueRef.current = searchValue;

  const sortRef = useRef(sort);
  sortRef.current = sort;

  const selectedGeneRef = useRef(selectedGene);
  selectedGeneRef.current = selectedGene;

  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const classes = useStyles();

  const sortGenes = (list, sort) => {
    const args = sortOptions[sort];
    return _.orderBy(list, args.iteratees, args.orders);
  };

  const fetchAllGenes = async () => {
    return await controller.fetchGeneList(filterQueryGenes);
  };

  const fetchGeneListFromElements = (eles) => {
    const genes = [];
    eles.forEach(el => {
      const name = el.data('name');
      const gene = controller.fetchGene(name);
      if (gene) {
        genes.push(gene);
      }
    });
    return genes;
  };

  const getGeneSetNames = (eles) => {
    const nodes = eles.nodes();

    const getNames = n => {
      const name = n.data('name');
      return Array.isArray(name) ? name : name.split(',');
    };

    // Fetch genes from nodes
    let gsNames = [];

    for (const el of nodes) {
      // Ignore compound nodes
      if (el.isParent()) {
        continue;
      }
      gsNames = gsNames.concat(getNames(el));
    }

    return _.uniq(gsNames);
  };

  /** Flashes the list quickly (shows the loading skeleton) so the user sees that the list has changed */
  const flashAndSetGenes = (genes) => {
    setGenes(null);
    setTimeout(() => setGenes(genes), 100);
  };

  const debouncedSelectionHandler = _.debounce(async () => {
    const eles = cy.nodes(':selected');
    if (eles.length > 0) {
      // Sync the node selection with the gene list, by filtering the genes that are in the selection
      const newGenes = fetchGeneListFromElements(eles);
      flashAndSetGenes(sortGenes(newGenes, sortRef.current));
    } else if (_.isEmpty(searchValueRef.current)) {
      const newGenes = await fetchAllGenes();
      flashAndSetGenes(sortGenes(newGenes, sortRef.current));
    }
  }, 250);

  const handleGeneListExport = () => {
    const selected = cy.nodes(':selected').length > 0; // any selected nodes?
    const eles = cy.nodes(selected);
    const gsNames = getGeneSetNames(eles);
    controller.exportController.exportGeneList(genes, gsNames);
  };

  const onNetworkLoaded = () => {
    setNetworkLoaded(true);
  };
  const onGeneListIndexed = () => {console.log('LEFT-DRAWER -- onGeneListIndexed...');
    setGeneListIndexed(true);
    debouncedSelectionHandler();
  };

  const onCySelectionChanged = () => {
    debouncedSelectionHandler();
  };

  const cancelSearch = () => {
    setSearchValue('');
    setSearchResult(null);
  };
  const search = (val) => {
    const query = val.trim();
    
    if (query.length > 0) {
      // Unselect Cy elements first
      const selectedEles = cy.elements().filter(':selected');
      selectedEles.unselect();
      // Now execute the search
      const res = controller.searchGenes(query);
      setSearchValue(val);
      setSearchResult(res);
    } else {
      cancelSearch();
    }
  };

  const updateCyHighlights = _.debounce((symbol) => {console.log('updateCyHighlights', symbol);
    if (symbol != null) {
      const nodes = cy.nodes().filter(n => symbol === n.data('name'));
      if (nodes.length > 0) {
        controller.highlightElements(nodes, true);
      } else {
        controller.unhighlightAllElements();
      }
    } else {
      controller.clearElementsHighlights();
    }
  }, 200);

  const toggleGeneDetails = async (symbol) => {
    const newSymbol = selectedGeneRef.current !== symbol ? symbol : null;
    updateCyHighlights(newSymbol);
    setSelectedGene(newSymbol);
    if (newSymbol != null)
      setInitialIndex(-1); // Make sure the scroll position doesn't change!
  };

  useEffect(() => {
    controller.bus.on('networkLoaded', onNetworkLoaded);
    controller.bus.on('geneListIndexed', onGeneListIndexed);

    const container = document.getElementById('cy');
    cy.mount(container);
    cy.resize();

    const clearSearch = _.debounce(() => {
      cancelSearch();
    }, 128);
    
    cyEmitter.on('select unselect', onCySelectionChanged);
    cyEmitter.on('select', () => clearSearch());
    cyEmitter.on('tap', evt => {
      if (evt.target === cy && selectedGeneRef.current != null) {
        // Tapping the network background should collapse the selected gene and clear the highlight
        toggleGeneDetails(selectedGeneRef.current);
      }
    });

    return function cleanup() {
      cyEmitter.removeAllListeners();
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
      controller.bus.removeListener('geneListIndexed', onGeneListIndexed);
    };
  }, []);

  useEffect(() => {
    if (searchResult != null) {
      setGenes(sortGenes(searchResult, sortRef.current));
    } else if (geneListIndexed) {
      debouncedSelectionHandler();
    }
  }, [searchResult]);

  useEffect(() => {
    // Check whether the previously selected gene is in the new 'genes' list
    if (genes != null && selectedGeneRef.current != null) {
      let idx = _.findIndex(genes, g => g.name === selectedGeneRef.current);
      if (idx >= 0) {
        // Scroll to the previously selected gene
        if (idx > 1) idx--; // if this gene is not the first in the list, make sure it doesn't look like it is
        setInitialIndex(idx);
      } else {
        // Collapses and deselect a gene if it's not contained in the new 'genes' list.
        toggleGeneDetails(selectedGeneRef.current);
        // And reset the scroll
        setInitialIndex(0);
      }
    }
  }, [genes]);

  useEffect(() => {
    if (genes != null)
      setInitialIndex(0); // Always reset the scroll when sorting has changed
  }, [sort]);

  const selectedNodes = cy.nodes(':selected');
  const isSearch = !_.isEmpty(searchValue);
  const totalGenes = genes != null ? genes.length : -1;
  
  const drawerVariant = isMobile || isTablet ? 'temporary' : 'persistent';
  
  // The 'keepMounted' property is only available when variant="temporary"
  // (keep it mounted so the GeneListPanel component can keep its state when closed)
  const drawerProps = {
    ...(drawerVariant === 'temporary' && { keepMounted: true })
  };

  // Change title according to node selection
  let title = 'All Genes';
  if (isSearch) {
    title = 'Search Results';
  } else if (selectedNodes.length > 0) {
    title = 'Genes in Selection';
  }

  return (
    <Drawer
      className={classes.root}
      variant={drawerVariant}
      anchor="left"
      open={open}
      onClose={onClose}
      {...drawerProps}
      PaperProps={{
        style: {
          overflow: "hidden"
        }
      }}
      classes={{
        paper: classes.paper,
      }}
    >
        <div className={classes.header}>
          <Toolbar variant="dense" className={classes.toolbar}>
            <Typography display="block" variant="subtitle2" color="textPrimary" className={classes.title}>
              { title }&nbsp;
            {totalGenes >= 0 && (
              <>
                <Typography display="inline" variant="body2" color="textSecondary">
                  &#40;{ totalGenes }&#41;
                </Typography> &nbsp;&nbsp;
                <Tooltip title="Download Current Gene List">
                  <IconButton size="small" color="inherit" onClick={handleGeneListExport}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            </Typography>
            <div className={classes.grow} />
            <IconButton
              color="inherit"
              size="large"
              className={classes.closeButton}
              onClick={onClose}
            >
              { drawerVariant === 'temporary' ? <CloseIcon /> : <KeyboardArrowLeftIcon fontSize="large" /> }
            </IconButton>
          </Toolbar>
          <Grid container direction="column" spacing={1} className={classes.controls}>
            <Grid item>
              <SearchBar
                disabled={!networkLoaded || !geneListIndexed}
                style={{
                  minWidth: 276,
                  maxWidth: 294,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
                placeholder="Find genes..."
                value={searchValue}
                onChange={search}
                onCancelSearch={cancelSearch}
              />
            </Grid>
          </Grid>
        </div>
        <div className={classes.content}>
        {networkLoaded && geneListIndexed && (
          <GeneListPanel
            controller={controller}
            genes={genes}
            selectedGene={selectedGene}
            initialIndex={initialIndex}
            isSearch={isSearch}
            isMobile={isMobile}
            onGeneClick={toggleGeneDetails}
          />
        )}
      </div>
    </Drawer>
  );
};

LeftDrawer.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  open: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isTablet: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LeftDrawer;