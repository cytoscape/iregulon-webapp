import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { dataTableHeight } from '../defaults';
import { logoPath, getComparator, stableSort, userSelectTextProps } from '../util';
import { NetworkEditorController } from './controller';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { Table, TableHead, TableBody, TableCell, TableRow, TableSortLabel } from '@mui/material';
import { Grid, Paper, Typography, Tooltip } from '@mui/material';
import { Checkbox, IconButton } from '@mui/material';

import IndeterminateCheckBoxOutlinedIcon from '@mui/icons-material/IndeterminateCheckBoxOutlined';
import NotIncludedIcon from '@mui/icons-material/NotInterested';
import IncludedIcon from '@mui/icons-material/Check';


const TARGET_COLUMNS = [
  { 
    id: 'rank',
    numeric: true,
    sortable: true,
    hideOnMobile: false,
    label: 'Rank',
    show: () => true,
    render: (row, col) => row[col.id],
  },
  { 
    id: 'name',
    numeric: false,
    sortable: true,
    hideOnMobile: false,
    label: 'Target',
    tooltip: "Predicted Target",
    show: () => true,
    render: (row, col) => row[col.id],
  },
  {
    id: 'included', // Special column for icons
    sortable: false,
    numeric: false,
    hideOnMobile: true,
    label: <>&nbsp;</>,
    tooltip: (type) => `Whether the selected ${type.toLowerCase()} is annotated for this target`,
    show: (type) => type === 'CLUSTER',
    render: () => <></>,
  },
];

const TF_COLUMNS = [
  {
    id: 'inNetwork', // Special column for checkboxes
    numeric: false,
    sortable: false,
    hideOnMobile: false,
    label: '',
    show: () => true,
  },
  { 
    id: 'name',
    numeric: false,
    sortable: true,
    hideOnMobile: false,
    label: 'TF',
    tooltip: "Predicted Transcription Factor",
    show: () => true,
    render: (row, col) => row[col.id],
  },
  { 
    id: 'minOrthologousIdentity',
    numeric: true,
    sortable: true,
    hideOnMobile: false,
    label: 'Orthologous Identity',
    tooltip: "Minimum identity between orthologous genes",
    show: (type, subtype) => type === 'MOTIF' || subtype === 'MOTIF',
    render: (row, col) => typeof row[col.id] === 'number' ? `${Math.round(row[col.id] * 100)}%` : 'N/A',
  },
  { 
    id: 'maxFDR',
    numeric: true,
    sortable: true,
    hideOnMobile: false,
    label: 'Motif Similarity (FDR)',
    tooltip: "Maximum False Discovery Rate (FDR) on motif similarity",
    show: (type, subtype) => type === 'MOTIF' || subtype === 'MOTIF',
    render: (row, col) => typeof row[col.id] === 'number' ? row[col.id].toExponential(3) : 'Direct',
  },
  {
    id: 'included', // Special column for icons
    type: 'CLUSTER',
    numeric: false,
    sortable: false,
    hideOnMobile: true,
    label: <>&nbsp;</>,
    tooltip: (type) => `Whether the selected ${type.toLowerCase()} is annotated for this TF`,
    show: (type) => type === 'CLUSTER',
    render: () => <></>,
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
    return {
      rank,
      name: geneID.name
    };
  });
  const tfRows = data.transcriptionFactors?.map(({ geneID, maxMotifSimilarityFDR, minOrthologousIdentity, inNetwork }) => {
    return {
      name: geneID.name,
      maxFDR: maxMotifSimilarityFDR,
      minOrthologousIdentity, inNetwork
    };
  });

  const type = data.type;
  const subtype = selectedMotifOrTrack?.type || type;
  const targetColumns = TARGET_COLUMNS.filter(col => (!col.hideOnMobile || !isMobile) && col.show(type, subtype));
  const tfColumns = TF_COLUMNS.filter(col => (!col.hideOnMobile || !isMobile) && col.show(type, subtype));

  let description = data.description;
  let logoImgPath;

  if (type === 'MOTIF') {
    logoImgPath = logoPath(data.nameWithCollection);
  } else if (type === 'CLUSTER' && selectedMotifOrTrack) {
    // Show the name and description of the selected motif/track in the cluster
    description = selectedMotifOrTrack.description;
    if (selectedMotifOrTrack.type === 'MOTIF') {
      logoImgPath = logoPath(selectedMotifOrTrack.name);
    }
  }

  const handleRowCheck = (row, checked) => {
    onTFCheckChange?.(row, checked, data.id);
  };

  return (
    <Paper className={classes.root} sx={{ display: visible ? 'block' : 'none' }}>
      <Grid container direction="row" spacing={1} sx={{ height: '100%' }}>
        <Grid item container xs={3} sx={{ height: '100%' }}>
          <Grid item xs={12} sx={{ height: '30%', pb: 0.5 }}>
            <Paper
              variant="outlined"
              sx={{p: theme.spacing(0.25, 1, 0.25, 1), overflowY: 'auto', height: '100%', borderRadius: 2, ...userSelectTextProps }} 
            >
              <Typography variant="caption">{ description }</Typography>
            </Paper>
          </Grid>
        {logoImgPath && (
          <Grid item xs={12} sx={{ height: '70%' }}>
            <Paper variant="outlined" sx={{ height: '100%', width: '100%', borderRadius: '8px', textAlign: 'center' }}>
              <img
                src={logoImgPath}
                alt={data.nameWithCollection}
                style={{ maxWidth: 300, width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
              />
            </Paper>
          </Grid>
        )}
        </Grid>
      {targetRows && targetRows.length > 0 && (
        <Grid item xs={3} flexGrow={1} sx={{ height: '100%' }}>
          <GeneTable
            type={subtype}
            columns={targetColumns}
            data={targetRows}
            defOrderBy="rank"
            defOrder="asc"
            motifOrTrackGenes={selectedMotifOrTrack?.candidateTargetGenes}
            isMobile={isMobile}
          />
        </Grid>
      )}
      {tfRows && tfRows.length > 0 && (
        <Grid item xs={6} sx={{height: '100%'}}>
          <GeneTable
            type={subtype}
            columns={tfColumns}
            data={tfRows}
            motifOrTrackGenes={selectedMotifOrTrack?.transcriptionFactors}
            isMobile={isMobile}
            onRowCheckChange={handleRowCheck}
          />
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
  },
  inNetworkCell: {
    borderLeft: 'none',
    width: 40,
    paddingLeft: '1px !important',
    paddingRight: '1px !important',
    textAlign: 'center',
  },
  rankCell: {
    borderLeft: 'none',
    width: 60,
    ...userSelectTextProps,
  },
  nameCell: {
    ...userSelectTextProps,
  },
  minOrthologousIdentityCell: {
    ...userSelectTextProps,
  },
  maxFDRCell: {
    ...userSelectTextProps,
  },
  includedCell: {
    width: 26,
    textAlign: 'center',
  },
}));

function GeneTable({ type, columns, data, defOrderBy, defOrder, motifOrTrackGenes, isMobile, onRowCheckChange }) {
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
      return typeof col.tooltip === 'function' ? col.tooltip(type) : col.tooltip;
    }
  };

  const isInSelectedMotifOrTrack = (geneName) => motifOrTrackGenes?.some(g => g.geneID.name === geneName);

  const totalRows = data.length;
  const totalCheckedRows = data.filter(row => isRowChecked(row)).length;
  const noneChecked = totalCheckedRows === 0;

  const renderHeaderCell = (col) => {
    switch(col.id) {
      case 'inNetwork':
        return (
          <Tooltip
            title={columnTooltip(col)}
            placement="top-start"
            arrow
          >
            <span>
              <IconButton
                disabled={data.length === 0 || noneChecked}
                sx={{ color: (theme) => theme.palette.text.primary }}
                onClick={handleUncheckAllClick}
              >
                <IndeterminateCheckBoxOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        );
      default:
        return (
          <Tooltip
            title={columnTooltip(col)}
            placement="top-start"
            arrow
          >
            <Typography component="span" variant="inherit" sx={{ fontSize: '0.75rem' }}>
              { typeof col.label === 'function' ? col.label() : col.label }
            {col.id === 'name' && data && (
              <Typography component="span" variant="inherit" sx={{ color: (theme) => theme.palette.text.disabled }}>
                &nbsp;&nbsp;&#40;{ totalRows }&#41;
              </Typography>
            )}
            </Typography>
          </Tooltip>
        );
    }
  };

  const renderBodyCell = (row, col) => {
    switch(col.id) {
      case 'inNetwork':
        return (
          <Checkbox
            sx={{ width: 24, height: 24 }}
            checked={isRowChecked(row)}
            onClick={() => handleRowCheck(row)}
          />
        );
      case 'included':
        return (
          isInSelectedMotifOrTrack(row.name) ?
            <IncludedIcon sx={{ color: (theme) => theme.palette.success.light, fontSize: 16, display: 'block', m: 'auto' }} />
            :
            <NotIncludedIcon sx={{ color: (theme) => theme.palette.text.disabled, opacity: 0.4, fontSize: 16, display: 'block', m: 'auto' }} />
        );
      default:
        return (
          <Typography
            component="span"
            variant="inherit"
            sx={{ fontSize: '0.75rem', color: (theme) => row[col.id] ? 'inherit' : theme.palette.text.disabled }}
          >
            { col.render(row, col, classes) }
          </Typography>
        );
    }
  };

  return (
    <Paper variant="outlined" className={classes.paper} sx={{height: '100%'}}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow className={classes.headerRow}>
          {columns.map((col) => (
            <TableCell
              key={col.id}
              align="left"
              sortDirection={orderBy === col.id ? order : false}
              className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true, [classes.tableHeaderCell]: true })}
            >
            { col.sortable ?
              <TableSortLabel
                active={orderBy === col.id}
                direction={orderBy === col.id ? order : 'asc'}
                onClick={(event) => handleRequestSort(event, col.id)}
              >
                { renderHeaderCell(col) }
              </TableSortLabel>
            :
              renderHeaderCell(col)
            }
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
              { renderBodyCell(row, col) }
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
  type: PropTypes.string.isRequired,
  columns: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  defOrderBy: PropTypes.string,
  defOrder: PropTypes.string,
  motifOrTrackGenes: PropTypes.array,
  isMobile: PropTypes.bool,
  onRowCheckChange: PropTypes.func,
};

export default DataDetailsPanel;