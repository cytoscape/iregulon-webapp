import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import clsx from 'clsx';

import { LEFT_DRAWER_WIDTH, BOTTOM_DRAWER_HEIGHT, DEFAULT_NETWORK_TYPE_SELECTION } from '../defaults';
import { EventEmitterProxy } from '../../../model/event-emitter-proxy';
import { NetworkEditorController } from './controller';
import DataTable, { DEF_SORT_FN, PRECISION, roundNumber } from './data-table';
import DataDetailsPanel from './data-details-panel';
import SearchBar from './search-bar';
import { updateNetworkStyle } from './network-style';
import { motifName, motifTrackLinkOut, resultId } from '../util';
import { useUIStateStore } from './store';

import makeStyles from '@mui/styles/makeStyles';

import Collapse from '@mui/material/Collapse';
import { AppBar, Toolbar, Divider, Grid } from '@mui/material';
import { Drawer, Tooltip, Typography } from '@mui/material';
import { IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { FormControl, Select, MenuItem } from '@mui/material';

import ExpandIcon from '@mui/icons-material/ExpandLess';
import CollapseIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


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
  row.id = resultId(obj);
  row.type = type;
  row.db = linkOut ? linkOut.db : null;
  row.name = type === 'MOTIF' ? motifName(name) : name;
  if (type === 'CLUSTER') {
    row.motifsAndTracks = obj.motifsAndTracks;
  } else {
    row.nameWithCollection = obj.name;
    row.rank = obj.rank;
  }
  row.description = obj.description;
  row.href = linkOut?.href;
  row.clusterNumber = obj.clusterNumber;
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
  const [ type, setType ] = useState(DEFAULT_NETWORK_TYPE_SELECTION);
  const [ searchTerms, setSearchTerms ] = useState();
  const [ currentRow, setCurrentRow ] = useState();
  const [ selectedMotifOrTrack, setSelectedMotifOrTrack ] = useState();
  const [ _, forceUpdate ] = useState(0); // Dummy state to force update

  const setSelectedTF = useUIStateStore((state) => state.setSelectedTF);

  const classes = useBottomDrawerStyles();

  const openRef = useRef(false);
  openRef.current = open;

  const searchValueRef = useRef(searchValue);
  const sortFnRef = useRef(DEF_SORT_FN);

  const disabledRef = useRef(true);
  disabledRef.current = disabled;

  const currentRowRef = useRef();
  currentRowRef.current = currentRow;
  
  const cy = controller.cy;
  const cyEmitter = new EventEmitterProxy(cy);

  const triggerUpdate = () => {
    forceUpdate(prev => prev + 1);
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
    const newDisabled = !controller.isNetworkLoaded() || !controller.isResultListIndexed();
    if (newDisabled !== disabled) {
      setDisabled(newDisabled);
    }
  }, 200);
  
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
    return () => {
      cyEmitter.removeAllListeners();
    };
  }, []);

  const handleTypeChange = (evt, value) => {
    if (value != null) {
      setType(value);
      const results = controller.fetchResults(value);
      setData(toTableData(results, value, sortFnRef.current));
    }
  };

  const onRowCheckChange = async (row, checked) => {
    // Update the TF in the row (UI object)
    const tfs = row.transcriptionFactors || [];
    if (tfs.length === 0) return;
    // Update the TranscriptionFactor Store
    if (checked) {
      // Select the first TF by default
      setSelectedTF(row.id, tfs[0].geneID.name, true);
    } else {
      // Unselect all TFs from this row
      row.transcriptionFactors.forEach(tf => setSelectedTF(row.id, tf.geneID.name, false));
    }
    // Update the UI checked state
    triggerUpdate();
    // Update the network
    if (checked) {
      controller.addToNetwork([{ ...row, transcriptionFactors: [tfs[0]] }]);
      updateNetworkStyle();
      await controller.applyLayout();
    } else {
      controller.removeFromNetwork([row]);
      updateNetworkStyle();
    }
  };
  const onRowClick = (row) => {
    setCurrentRow(row);
    setSelectedMotifOrTrack(row?.motifsAndTracks?.[0]);
  };
  const onDataSort = (sortFn) => {
    sortFnRef.current = sortFn; // Save the current sort function for later use
  };

  const onMotifAndTrackSelectChange = (motifOrTrack) => {
    setSelectedMotifOrTrack(motifOrTrack);
  };

  const onTFCheckChange = async (tfInfo, checked, rowId) => {
    // Find the row to update
    let row = data.find(r => r.type === type && r.id === rowId);
    // Update the TranscriptionFactor Store
    setSelectedTF(rowId, tfInfo.name, checked);
    // Update the UI checked state
    triggerUpdate();
    // Update the network
    // (do not pass the actual row, but clone it and filter out the other TFs, so only the checked/unchecked one is added/removed)
    const tfs = row.transcriptionFactors || [];
    const tf = tfs.find(el => el.geneID.name === tfInfo.name);
    row = { ...row, transcriptionFactors: [tf] };
    if (checked) {
      controller.addToNetwork([row]);
      updateNetworkStyle();
      await controller.applyLayout();
    } else {
      controller.removeFromNetwork([row]);
      updateNetworkStyle();
    }
  };

  const shiftDrawer = leftDrawerOpen && !isMobile && !isTablet; 
  const total = disabled ? 0 : data.length;

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
                &nbsp;&#40;{ total }&#41;
              </Typography>
            )}
            </Typography>
          )}
          {open && (
            currentRow ?
              <ToolbarButton
                title="Back"
                icon={<ArrowBackIcon fontSize="medium" />}
                onClick={() => { setCurrentRow(null); setSelectedMotifOrTrack(null); }}
              />
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
            <Typography component="span" variant="subtitle2" color="textPrimary" sx={{ml: 2}}>
              {currentRow.name}
            {currentRow.db && (
              <Typography component="span" variant="caption" color="textSecondary">
                &nbsp;&nbsp;<sub>{currentRow.db}</sub>
              </Typography>
            )}
            </Typography>
          )}
            <ToolbarDivider unrelated />
          {open && currentRow && type === 'CLUSTER' && (
            <MotifAndTrackSelect motifsAndTracks={currentRow.motifsAndTracks} onChange={onMotifAndTrackSelectChange} />
          )}
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
            <ToolbarDivider />
            <ToolbarButton
              title="Results"
              icon={open ? <CollapseIcon fontSize="large" /> : <ExpandIcon fontSize="large" />}
              disabled={disabled}
              onClick={() => onToggle(!open)}
            />
          </Toolbar>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <DataTable
              visible={open && currentRow == null}
              data={data}
              type={type}
              currentRow={currentRow}
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
              selectedMotifOrTrack={selectedMotifOrTrack}
              controller={controller}
              isMobile={isMobile}
              onTFCheckChange={onTFCheckChange}
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

//==[ MotifAndTrackSelect ]===========================================================================================

function MotifAndTrackSelect({ motifsAndTracks, onChange }) {
  const [value, setValue] = useState(0);

  const handleChange = (event) => {
    const idx = event.target.value;
    setValue(idx);
    const obj = motifsAndTracks[idx];
    onChange?.(obj);
  };

  return (
    <FormControl variant="filled" size="small">
      <Select
        variant="outlined"
        value={value}
        onChange={handleChange}
        autoWidth
        sx={{ backgroundColor: (theme) => theme.palette.background.paper, fontSize: '0.75rem' }}
        renderValue={(val) => (
          <Grid container spacing={2} sx={{ mr: 2 }}>
            <Grid item sx={{ color: (theme) => theme.palette.text.disabled, textAlign: 'right' }}>
              { motifsAndTracks[val].rank }
            </Grid>
            <Grid item >
              { motifsAndTracks[val].name }
            </Grid>
          </Grid>
        )}
      >
      {motifsAndTracks.map(({ rank, name, nes, auc, transcriptionFactors }, idx) => (
        <MenuItem key={rank} value={idx} sx={{ py: 1 }}>
          <Grid container spacing={4} sx={{ mr: 4 }}>
            <Grid item xs={2} sx={{ color: (theme) => theme.palette.text.disabled, textAlign: 'right' }}>
              { rank }
            </Grid>
            <Grid item container direction="column" xs={10}>
              <Grid item>
                { name }
              </Grid>
              <Grid item>
                <Typography
                  component="div"
                  variant="caption"
                  sx={{ display: 'flex', flexDirection: 'row', color: (theme) => theme.palette.text.disabled }}
                >
                  NES:&nbsp;{roundNumber(nes).toFixed(PRECISION)}
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  AUC:&nbsp;{roundNumber(auc).toFixed(PRECISION)}
                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                  TFs:&nbsp;{transcriptionFactors.length}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </MenuItem>
      ))}
      </Select>
    </FormControl>
  );
}
MotifAndTrackSelect.propTypes = {
  motifsAndTracks: PropTypes.array.isRequired,
  onChange: PropTypes.func,
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

export default BottomDrawer;