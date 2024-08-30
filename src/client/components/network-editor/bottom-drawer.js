import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';

import { LEFT_DRAWER_WIDTH, BOTTOM_DRAWER_HEIGHT, DEFAULT_PADDING } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import { REG_COLOR_RANGE } from './network-style';
import DataTable, { DEF_SORT_FN } from './data-table';
import DataDetailsPanel from './data-details-panel';
import SearchBar from './search-bar';
import { motifName, motifTrackLinkOut, rowId, rowTypeIdField } from '../util';
import { UpDownLegend, numToText } from './charts';

import makeStyles from '@mui/styles/makeStyles';

import Collapse from '@mui/material/Collapse';
import { AppBar, Toolbar, Divider, Grid } from '@mui/material';
import { Drawer, Tooltip, Typography } from '@mui/material';
import { Button, IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';

import ExpandIcon from '@mui/icons-material/ExpandLess';
import CollapseIcon from '@mui/icons-material/ExpandMore';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';


export const NODE_COLOR_SVG_ID = 'node-color-legend-svg';

const typeOptions = {
  MOTIF: {  
    label: 'Motifs',
    description: 'Show motifs only',
  },
  TRACK: {
    label: 'Tracks',
    description: 'Show tracks only',
  },
  CLUSTER: {
    label: 'TFs',
    description: 'Show transcription factors only',
  },
};

function toTableRow(obj, type) {
  const name = obj.name;
  const linkOut = type !== 'CLUSTER' ? motifTrackLinkOut(name) : null;
  
  const row = {};
  row.id = rowId(type, obj[rowTypeIdField(type)]);
  row.type = type;
  row.db = linkOut ? linkOut.db : null;
  row.name = type === 'MOTIF' ? motifName(name) : name;
  if (type !== 'CLUSTER') {
    row.nameWithCollection = obj.name;
    row.rank = obj.rank;
  }
  row.description = obj.description;
  row.href = linkOut?.href;
  row.clusterCode = obj.clusterCode;
  row.nes = obj.nes;
  row.auc = obj.auc;
  row.candidateTargetGenes = obj.candidateTargetGenes || [];
  row.transcriptionFactors = obj.transcriptionFactors || [];

  return row;
}

function toTableData(results, type, sortFn) {
  const data = [];
  for (const obj of results) {
    const row = toTableRow(obj, type);
    data.push(row);
  }
  return sortFn ? sortFn(data) : data;
}

//==[ BottomDrawer ]==================================================================================================

const useBottomDrawerStyles = makeStyles((theme) => ({
  appBar: {
    backgroundColor: theme.palette.background.header,
    minHeight: BOTTOM_DRAWER_HEIGHT,
    top: 'auto',
    bottom: 0,
    borderTop: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
    [theme.breakpoints.down('md')]: {
      paddingRight: theme.spacing(0.5),
    },
  },
  toolbarOpen: {
    paddingLeft: theme.spacing(1.115),
  },
  hide: {
    display: 'none',
  },
  drawer: {
    position: 'absolute',
    top: 'auto',
    bottom: 0,
    zIndex: theme.zIndex.drawer - 10,
    background: theme.palette.background.default,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  drawerShift: {
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaper: {
    height: 'auto',
    background: theme.palette.background.default,
  },
  drawerContent: {
    background: 'inherit',
    width: '100%',
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  drawerContentShift: {
    width: `calc(100% - ${LEFT_DRAWER_WIDTH}px)`,
    marginLeft: LEFT_DRAWER_WIDTH,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  list: {
    width: 250,
  },
  fullList: {
    width: 'auto',
  },
  grow: {
    flexGrow: 1,
  },
  legendText: {
    fontSize: '0.75em',
    color: theme.palette.text.secondary,
  },
}));

export function BottomDrawer({ controller, open, leftDrawerOpen, isMobile, isTablet, onToggle }) {
  const [ disabled, setDisabled ] = useState(true);
  const [ searchValue, setSearchValue ] = useState('');
  const [ data, setData ] = useState([]);
  const [ type, setType ] = useState('MOTIF');
  const [ searchTerms, setSearchTerms ] = useState();
  const [ checkedRows, setCheckedRows ] = useState([]);
  const [ currentRow, setCurrentRow ] = useState();
  const [ gotoCurrentNode, setGotoCurrentNode ] = useState(true);
  const [ scrollToId, setScrollToId ] = useState();

  const classes = useBottomDrawerStyles();

  const openRef = useRef(false);
  openRef.current = open;

  const searchValueRef = useRef(searchValue);
  const sortFnRef = useRef(DEF_SORT_FN);

  const disabledRef = useRef(true);
  disabledRef.current = disabled;

  const lastClickedRowRef = useRef(); // Will be used to prevent clearing the search when clicking a table row

  const currentRowRef = useRef();
  currentRowRef.current = currentRow;
  
  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const updateCheckedRowsFromNetwork = () => {
    const nodes = cy.nodes();
    const newCheckedRows = [];
    if (nodes.length > 0) {
      const map = new Map();
      nodes.forEach(n => {
        const source = n.data('source') || [];
        source.forEach(s => {
          const parts = s.split('-');
          if (parts.length === 2) {
            const type = parts[0].toUpperCase();
            const typeId = parts[1];
            const id = rowId(type, typeId);
            map.get(id) || (map.set(id, { id, type }) && newCheckedRows.push(map.get(id)));
          }
        });
      });
    }
    setCheckedRows(newCheckedRows);
  };

  const updateData = () => {
    // Update table data
    const results = controller.fetchResults(type);
    let data = toTableData(results, type);

    // Filter out rows that don't match the search terms
    const searchTerms = searchValueRef.current ? searchValueRef.current.toLowerCase().trim().split(' ') : [];

    if (searchTerms.length > 0) {
      const filteredData = [];

      OUTER:
      for (const obj of data) {
        for (const term of searchTerms) {
          if (obj.name.toLowerCase().includes(term)) {
            filteredData.push(obj);
            continue OUTER;
          }
        }
      }

      data = filteredData;
    }

    setSearchTerms(searchTerms);
    setData(data);
  };
  
  const debouncedOnNetworkChange = _.debounce(() => {
    updateCheckedRowsFromNetwork();
    const newDisabled = !controller.isNetworkLoaded() || !controller.isResultListIndexed();
    if (newDisabled !== disabled) {
      setDisabled(newDisabled);
    }
  }, 200);
  const debouncedBoxSelectHandler = _.debounce((target) => {
    // Scroll to the last box selected element
    setScrollToId(target.data('id'));
  }, 100);
  
  const search = (val) => {
    // Now execute the search
    const query = val.trim();
    if (query.length > 0) {
      // Unselect Cy elements first
      const selectedEles = cy.elements().filter(':selected');
      selectedEles.unselect();
      searchValueRef.current = val;
      setSearchValue(val);
    } else {
      searchValueRef.current = query;
      setSearchValue(query);
    }
    updateData();
  };
  const cancelSearch = () => {
    search('');
  };

  const onResultsIndexed = () => {
    const results = controller.fetchResults(type);
    setData(toTableData(results, type));
    setDisabled(false);
  };

  useEffect(() => {
    controller.bus.on('resultsIndexed', onResultsIndexed);
    return function cleanup() {
      controller.bus.removeListener('resultsIndexed', onResultsIndexed);
    };
  }, []);

  useEffect(() => {
    const onNetworkLoaded = () => debouncedOnNetworkChange();
    controller.bus.on('networkLoaded', onNetworkLoaded);
    return () => {
      controller.bus.removeListener('networkLoaded', onNetworkLoaded);
    };
  }, []);

  useEffect(() => {
    cyEmitter.on('add remove', debouncedOnNetworkChange);
    cyEmitter.on('boxselect', evt => {
      if (openRef.current && evt.target.group() === 'nodes' && !evt.target.isParent()) {
        debouncedBoxSelectHandler(evt.target);
      }
    });
    return () => {
      cyEmitter.removeAllListeners();
    };
  }, []);

  const handleTypeChange = (evt, value) => {
    if (value != null) {
      setType(value);
      setData(toTableData(controller.fetchResults(value), value, sortFnRef.current));
    }
  };

  const onRowCheckChange = async (row, checked) => {
    lastClickedRowRef.current = row.id;
    const newCheckedRows = [...checkedRows];
    const idField = rowTypeIdField(row.type);
    if (checked) {
      // Add to the network
      newCheckedRows.push(row);
      setCheckedRows(newCheckedRows);
      const result = controller.fetchResults(row.type).find(r => r.type === row.type && r[idField] === row[idField]);
      controller.addToNetwork([result]);
      await controller.applyLayout();
      cy.fit(DEFAULT_PADDING);
    } else {
      // Remove from the network
      const idx = newCheckedRows.findIndex(r => r.id === row.id);
      if (idx >= 0) {
        newCheckedRows.splice(idx, 1)[0];
        setCheckedRows(newCheckedRows);
        const result = controller.fetchResults(row.type).find(r => r.type === row.type && r[idField] === row[idField]);
        controller.removeFromNetwork([result]);
      }
    }
  };
  const onRowClick = (row, selected, preventGotoNode = false) => {
    lastClickedRowRef.current = row.id;
    if (selected) {
      setGotoCurrentNode(!preventGotoNode);
      setCurrentRow(row);
    } else {
      setCurrentRow(null);
    }
  };
  const onDataSort = (sortFn) => {
    sortFnRef.current = sortFn; // Save the current sort function for later use
  };

  const shiftDrawer = leftDrawerOpen && !isMobile && !isTablet; 
  const magNES = controller.style ? controller.style.magNES : undefined;
  const total = disabled ? 0 : data.length;
  const filteredSelectedRows = [];//selectedRows.filter(a => data.some(b => a.id === b.id)); // TODO
  const totalSelected = filteredSelectedRows.length;

  return (
    <Drawer
      className={clsx(classes.drawer, { [classes.drawerShift]: shiftDrawer })}
      variant="permanent"
      anchor="bottom"
      open={true} // It's always open here, but not expanded--don't confuse it with the 'open' state
      PaperProps={{
        style: {
          overflow: "hidden"
        }
      }}
      classes={{
        paper: classes.drawerPaper,
      }}
    >
      <div role="presentation" className={clsx(classes.drawerContent, { [classes.drawerContentShift]: shiftDrawer })}>
        <AppBar position="fixed" color="default" className={clsx(classes.appBar, { [classes.appBarShift]: shiftDrawer })}>
          <Toolbar variant="dense" className={clsx(classes.toolbar, { [classes.toolbarOpen]: open })}>
          {!open && !currentRow && (
            <Typography display="block" component="span" variant="subtitle2" color="textPrimary" sx={{textTransform: 'capitalize'}}>
              {type === 'CLUSTER' ? 'Transcription Factor' : type.toLowerCase()}s&nbsp;
            {total >= 0 && (
              <Typography display="inline" component="span" variant="body2" color="textSecondary">
                &nbsp;({!isMobile && totalSelected > 0 ? totalSelected + ' selected of ' : ''}{ total })
              </Typography>
            )}
            </Typography>
          )}
          {open && (
            currentRow ?
              <Button
                variant="outlined"
                color="inherit" 
                startIcon={!isMobile && <NavigateBeforeIcon />}
                sx={{marginRight: 2}}
                onClick={() => setCurrentRow(null)}
              >
                {isMobile ? <NavigateBeforeIcon /> : 'Back'}
              </Button>
            :
              <SearchBar
                style={{width: 294}}
                placeholder={`Find ${type === 'CLUSTER' ? 'TF' : type.toLowerCase()}s...`}
                value={searchValue}
                onChange={search}
                onCancelSearch={cancelSearch}
              />
          )}
          {currentRow && (
            <Typography component="span" variant="subtitle2" color="textPrimary">
              {currentRow.name}
            {currentRow.db && (
              <Typography component="span" variant="caption" color="textSecondary">
                &nbsp;&nbsp;<sub>{currentRow.db}</sub>
              </Typography>
            )}
            </Typography>
          )}
            <ToolbarDivider unrelated />
            <div className={classes.grow} />
          {open && !currentRow && (
            <ToggleButtonGroup
              value={type}
              exclusive
              onChange={handleTypeChange}
            >
            {Object.entries(typeOptions).map(([k, { label, description }]) => (
              <ToggleButton
                key={`type-${k}`}
                value={k}
                size="small"
                sx={{ textTransform: 'unset' }}
              >
                <Tooltip placement="top" title={description}>
                  <Typography>{ label }</Typography>
                </Tooltip>
              </ToggleButton>
            ))}
            </ToggleButtonGroup>
          )}
          {/* {!(open && isMobile) && magNES && (
            <Grid container direction="column" spacing={0} style={{minWidth: 40, maxWidth: 300, width: '100%', marginTop: 16}}>
              <Grid item>
                <UpDownLegend
                  values={selectedNESValues}
                  minValue={-magNES}
                  maxValue={magNES}
                  downColor={REG_COLOR_RANGE.downMax}
                  zeroColor={REG_COLOR_RANGE.zero}
                  upColor={REG_COLOR_RANGE.upMax}
                  height={16}
                  tooltip="Normalized Enrichment Score (NES)"
                  style={{width: '100%'}}
                />
              </Grid>
              <Grid item>
                <Grid container direction="row" spacing={0} justifyContent="space-between">
                  <Tooltip title={`Downregulated (-${numToText(magNES)})`}>
                    <Typography variant="body2" component="div" className={classes.legendText}>DOWN</Typography>
                  </Tooltip>
                  <Tooltip title={`Upregulated (+${numToText(magNES)})`}>
                    <Typography variant="body2" component="div" className={classes.legendText}>UP</Typography>
                  </Tooltip>
                </Grid>
              </Grid>
            </Grid>
          )} */}
            <ToolbarDivider />
            <ToolbarButton
              title="Results"
              icon={open ? <CollapseIcon fontSize="large" /> : <ExpandIcon fontSize="large" />}
              edge="start"
              disabled={disabled}
              onClick={() => onToggle(!open)}
            />
          </Toolbar>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <DataTable
              visible={open && currentRow == null}
              data={data}
              type={type}
              checkedRows={checkedRows}
              selectedRows={filteredSelectedRows}
              currentRow={currentRow}
              gotoCurrentNode={gotoCurrentNode}
              scrollToId={scrollToId}
              searchTerms={searchTerms}
              controller={controller}
              isMobile={isMobile}
              onRowCheckChange={onRowCheckChange}
              onRowClick={onRowClick}
              onDataSort={onDataSort}
            />
            <DataDetailsPanel
              visible={open && currentRow != null}
              data={currentRow || {}}
              controller={controller}
              isMobile={isMobile}
            />
          </Collapse>
        </AppBar>
      </div>
    </Drawer>
  );
}
BottomDrawer.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController),
  open: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isTablet: PropTypes.bool.isRequired,
  leftDrawerOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

//==[ ToolbarButton ]=================================================================================================

function ToolbarButton({ title, icon, color, className, disabled, onClick }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          disabled={disabled}
          size="small"
          color={color || 'inherit'}
          className={className}
          onClick={onClick}
        >
          { icon }
        </IconButton>
      </span>
    </Tooltip>
  );
}
ToolbarButton.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

//==[ ToolbarDivider ]================================================================================================

const useToolbarDividerStyles = makeStyles((theme) => ({
  divider: {
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5),
    border: 'none',
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    border: 'none',
  },
}));

function ToolbarDivider({ unrelated }) {
  const classes = useToolbarDividerStyles();

  return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
}
ToolbarDivider.propTypes = {
  unrelated: PropTypes.bool
};

//==[ SelectionNavigator ]============================================================================================

const useSelectionNavigatorStyles = makeStyles(() => ({
  root: {
    maxWidth: 24,
  },
  button: {
    minWidth: 24,
    maxWidth: 24,
    minHeight: 24,
    maxHeight: 24,
  },
}));

export default BottomDrawer;