import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { dataTableHeight } from '../defaults';
import { logoPath, getComparator, stableSort } from '../util';
import { NetworkEditorController } from './controller';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { Table, TableHead, TableBody, TableCell, TableRow, TableSortLabel } from '@mui/material';
import { Box, Grid, Paper, Typography, Tooltip } from '@mui/material';
import { Checkbox, IconButton } from '@mui/material';

import IndeterminateCheckBoxOutlinedIcon from '@mui/icons-material/IndeterminateCheckBoxOutlined';


const TARGET_COLUMNS = [
  { 
    id: 'rank',
    numeric: true,
    hideOnMobile: false,
    label: 'Rank',
    render: (row, col) => row[col.id],
  },
  { 
    id: 'name',
    numeric: false,
    hideOnMobile: false,
    label: 'Target',
    tooltip: "Predicted Target",
    render: (row, col) => row[col.id],
  },
];

const TF_COLUMNS = [
  {
    id: 'inNetwork', // Special column for checkboxes
    numeric: false,
    hideOnMobile: false,
    label: '',
    show: () => true,
    render: () => <></>,
  },
  { 
    id: 'name',
    numeric: false,
    hideOnMobile: false,
    label: 'TF',
    tooltip: "Predicted Transcription Factor",
    render: (row, col) => row[col.id],
  },
  { 
    id: 'minOrthologousId',
    type: 'MOTIF',
    numeric: true,
    hideOnMobile: false,
    label: 'Orthologous ID',
    tooltip: "Minimum Identity between orthologous genes",
    render: (row, col) => row[col.id],
  },
  { 
    id: 'maxFDR',
    type: 'MOTIF',
    numeric: true,
    hideOnMobile: false,
    label: 'Motif Similarity (FDR)',
    tooltip: "Maximum False Discovery Rate on motif similarity",
    render: (row, col) => row[col.id],
  },
];

const useDataDetailsPanelStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    padding: theme.spacing(0.5, 1, 0, 1),
    height: dataTableHeight(theme),
    color: theme.palette.text.disabled,
  },
  // link: {
  //   marginLeft: theme.spacing(0.5),
  //   "&[disabled]": {
  //     color: theme.palette.text.secondary,
  //     cursor: "default",
  //     "&:hover": {
  //       textDecoration: "none"
  //     }
  //   }
  // },
  // openInNewIcon: {
  //   fontSize: '1rem',
  // },
}));

export function DataDetailsPanel({
  visible,
  data, // Track, Motif or TF
  selectedMotifOrTrack, // Only used for CLUSTER data
  controller,
  isMobile,
  onTFCheckChange,
}) {
  const classes = useDataDetailsPanelStyles();
  const theme = useTheme();
  console.log('data (DataDetailsPanel):', data);
  
  const targetRows = data.candidateTargetGenes?.map(({ geneID, rank }) => {
    return { rank, name: geneID.name };
  });
  const tfRows = data.transcriptionFactors?.map(({ geneID, maxMotifSimilarityFDR, minOrthologousIdentity, inNetwork }) => {
    return { name: geneID.name, maxFDR: maxMotifSimilarityFDR, minOrthologousId: minOrthologousIdentity, inNetwork };
  });

  const type = data.type;
  const targetColumns = TARGET_COLUMNS.filter(col => (!col.hideOnMobile || !isMobile) && (!col.type || col.type === type));
  const tfColumns = TF_COLUMNS.filter(col => (!col.hideOnMobile || !isMobile) && (!col.type || col.type === type));

  let description = data.description;
  let logoImgPath;

  if (type === 'MOTIF') {
    logoImgPath = logoPath(data.nameWithCollection);
  } else if (type === 'CLUSTER' && selectedMotifOrTrack) {
    // Show the name and description of the selected motif/track in the cluster
    description = selectedMotifOrTrack.name + ' -- ' + selectedMotifOrTrack.description;
    if (selectedMotifOrTrack.type === 'MOTIF') {
      logoImgPath = logoPath(selectedMotifOrTrack.name);
    }
  }

  const handleRowCheck = (row, checked) => {
    onTFCheckChange?.(row, checked, data.id);
  };
  
  return (
    <Paper className={classes.root} sx={{display: visible ? 'block' : 'none'}}>
      <Grid container direction="row" spacing={1} sx={{height: '100%'}}>
        <Grid item xs={type === 'MOTIF' ? 3 : 4} sx={{height: '100%'}}>
          <Box sx={{height: '100%', border: 'none'}}>
            <Paper
              variant="outlined"
              sx={{p: theme.spacing(0.25, 1, 0.25, 1), overflowY: 'auto', maxHeight: 100, borderRadius: 2}}
            >
              <Typography variant="caption">{description}</Typography>
            </Paper>
          {logoImgPath && (
            <Paper
              variant="outlined"
              sx={{mt: 0.5, p: 0, borderRadius: 2}}
            >
              <img
                src={logoImgPath}
                alt={data.nameWithCollection}
                style={{width: '100%', height: 'auto', borderRadius: 8}}
              />
            </Paper>
          )}
          </Box>
        </Grid>
      {targetRows && targetRows.length > 0 && (
        <Grid item xs={type === 'MOTIF' ? 3 : 4} sx={{height: '100%'}}>
          <GeneTable columns={targetColumns} data={targetRows} defOrderBy="rank" defOrder="asc" isMobile={isMobile} />
        </Grid>
      )}
      {tfRows && tfRows.length > 0 && (
        <Grid item xs={type === 'MOTIF' ? 6 : 4} sx={{height: '100%'}}>
          <GeneTable columns={tfColumns} data={tfRows} isMobile={isMobile} onRowCheckChange={handleRowCheck} />
        </Grid>
      )}
      </Grid>
    </Paper>
  );
}
DataDetailsPanel.propTypes = {
  visible: PropTypes.bool.isRequired,
  data: PropTypes.object.isRequired,
  selectedMotifOrTrack: PropTypes.object,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  isMobile: PropTypes.bool,
  onTFCheckChange: PropTypes.func,
};

//==[ GeneTable ]=====================================================================================================

const useGeneTableStyles = makeStyles((theme) => ({
  paper: {
    width: '100%',
    padding: 0,
    borderRadius: 8,
    color: theme.palette.text.disabled,
    overflowY: 'scroll',
  },
  subheader: {
    lineHeight: '1.25em',
    textAlign: 'left',
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  headerRow: {
    height: 40,
    backgroundColor: theme.palette.background.default,
  },
  tableHeaderCell: {
    borderLeft: `1px solid transparent`,
    borderImage: `linear-gradient(to bottom, transparent 25%,${theme.palette.divider} 25%,${theme.palette.divider} 75%,transparent 75%)`,
    borderImageSlice: 5,
    cursor: 'default !important',
  },
  tableCell: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: `${theme.spacing(0.5)} !important`,
    paddingRight: theme.spacing(0.5),
    borderBottom: `1px solid ${theme.palette.table.divider}`,
    cursor: 'pointer',
  },
  rankCell: {
    borderLeft: 'none',
    minWidth: 48,
    maxWidth: 68,
  },
  inNetworkCell: {
    borderLeft: 'none',
    paddingLeft: '1px !important',
    paddingRight: '1px !important',
    textAlign: 'center',
  },
  nameCell: {
    width: '95%',
    maxWidth: 0,
  },
  minOrthologousIdCell: {
    width: '35%',
  },
  maxFDRCell: {
    width: '35%',
  },
}));

function GeneTable({ columns, data, defOrderBy, defOrder, isMobile, onRowCheckChange }) {
  const [orderBy, setOrderBy] = useState(defOrderBy);
  const [order, setOrder] = useState(defOrder);

  const classes = useGeneTableStyles();

  const sortedDataRef = useRef();
  sortedDataRef.current = stableSort(data, getComparator(order, orderBy));

  // Sorting
  useEffect(() => {
    if (defOrderBy && defOrder) {
      const comparator = getComparator(order, orderBy);
      const sortedData = stableSort(data, comparator);
      sortedDataRef.current = sortedData;
    }
  }, [order, orderBy]);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  const isRowChecked = (row) => {
    return Boolean(row['inNetwork']);
  };
  const handleRowCheck = (row) => {
    const checked = isRowChecked(row);
    onRowCheckChange?.(row, !checked);
  };

  const handleUncheckAllClick = (evt) => {
    if (sortedDataRef.current) {
      sortedDataRef.current.forEach(row => {
        isRowChecked(row) && handleRowCheck(row);
      });
    }
    evt.stopPropagation();
  };

  const columnTooltip = (col) => {
    if (col.id === 'inNetwork') {
      return noneChecked ?
        `Select one or more TFs to add their associated genes to the network` :
        `Select none (remove all TF genes from network)`;
    } else {
      return typeof col.tooltip === 'function' ? col.tooltip() : col.tooltip;
    }
  };

  const totalRows = data.length;
  const totalCheckedRows = data.filter(row => isRowChecked(row)).length;
  const noneChecked = totalCheckedRows === 0;

  return (
    <Paper variant="outlined" className={classes.paper} sx={{height: '100%'}}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow className={classes.headerRow}>
          {columns.map((col, idx) => (
            <TableCell
              key={col.id}
              align="left"
              sortDirection={orderBy === col.id ? order : false}
              className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true, [classes.tableHeaderCell]: true })}
            >
              <Tooltip
                title={columnTooltip(col)}
                placement="top-start"
                arrow
              >
              {col.id === 'inNetwork' ?
                <span>
                  <IconButton
                    disabled={data.length === 0 || noneChecked}
                    sx={{color: (theme) => theme.palette.text.primary}}
                    onClick={handleUncheckAllClick}
                  >
                    <IndeterminateCheckBoxOutlinedIcon />
                  </IconButton>
                </span>
              :
                <TableSortLabel 
                  active={orderBy === col.id}
                  direction={orderBy === col.id ? order : 'asc'}
                  onClick={(event) => handleRequestSort(event, col.id)}
                >
                  { typeof col.label === 'function' ? col.label() : col.label }
                {col.id === 'name' && data && (
                  <Typography component="span" variant="body2" sx={{ color: (theme) => theme.palette.text.disabled }}>
                    &nbsp;&nbsp;&#40;{ totalRows }&#41;
                  </Typography>
                )}
                </TableSortLabel>
              }
              </Tooltip>
            </TableCell>
          ))}
          </TableRow>
        </TableHead>
        <TableBody>
        {sortedDataRef.current?.map((row, rowIdx) => (
          <TableRow key={`row-${rowIdx}`} className={classes.tableRow}>
          {columns.map((col, idx) => 
            <TableCell
              key={rowIdx + '_' + idx}
              align={col.numeric ? 'right' : 'left'}
              className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true })}
            >
            {col.id === 'inNetwork' ?
              <Checkbox
                sx={{ width: 24, height: 24 }}
                checked={isRowChecked(row)}
                onClick={() => handleRowCheck(row)}
              />
            :
              col.render(row, col, classes)
            }
            </TableCell>
          )}
          </TableRow>
        ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
GeneTable.propTypes = {
  columns: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  defOrderBy: PropTypes.string,
  defOrder: PropTypes.string,
  isMobile: PropTypes.bool,
  onRowCheckChange: PropTypes.func,
};

export default DataDetailsPanel;