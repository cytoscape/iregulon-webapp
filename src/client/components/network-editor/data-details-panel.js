import React, { forwardRef, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { DEFAULT_PADDING, dataTableHeight } from '../defaults';
import { NetworkEditorController } from './controller';
import { UpDownHBar, PValueStarRating } from './charts';
import { logoPath } from '../util';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { TableContainer, Table, TableHead, TableBody, TableCell, TableRow, TableSortLabel } from '@mui/material';
import { Box, Grid, Paper, Typography, Link, Tooltip } from '@mui/material';
import { List, ListSubheader, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Button, Checkbox } from '@mui/material';

import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LabelImportantIcon from '@mui/icons-material/LabelImportant';


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
  controller,
  isMobile,
}) {
  const classes = useDataDetailsPanelStyles();
  const theme = useTheme();
  
  const targetRows = data.candidateTargetGenes?.map(({ geneID, rank }) => {
    return { rank, name: geneID.name };
  });
  const tfRows = data.transcriptionFactors?.map(({ geneID, maxMotifSimilarityFDR, minOrthologousIdentity }) => {
    return { name: geneID.name, maxFDR: maxMotifSimilarityFDR, minOrthologousId: minOrthologousIdentity };
  });

  const type = data.type;
  const targetColumns = TARGET_COLUMNS.filter(col => (!col.hideOnMobile || !isMobile) && (!col.type || col.type === type));
  const tfColumns = TF_COLUMNS.filter(col => (!col.hideOnMobile || !isMobile) && (!col.type || col.type === type));

  let description = data.description;
  let logoImgPath;

  if (type === 'MOTIF') {
    logoImgPath = logoPath(data.nameWithCollection);
  } else if (type === 'CLUSTER') {
    // TODO: temporary solution!
    // Show the name and description of the first motif/track in the cluster, which is the one with the highest NES.
    if (data.motifsAndTracks.length > 0) {
      description = data.motifsAndTracks[0].name + ' -- ' + data.motifsAndTracks[0].description;
      if (data.motifsAndTracks[0].type === 'MOTIF') {
        logoImgPath = logoPath(data.motifsAndTracks[0].name);
      }
    }
  }
  
  return (
    <Paper className={classes.root} sx={{display: visible ? 'block' : 'none'}}>
      <Grid container direction="row" spacing={1} sx={{height: '100%'}}>
        <Grid item xs={type === 'MOTIF' ? 3 : 4} sx={{height: '100%'}}>
          <Box variant="outlined" sx={{height: '100%', border: 'none'}}>
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
          <GeneTable columns={targetColumns} data={targetRows} isMobile={isMobile} />
        </Grid>
      )}
      {tfRows && tfRows.length > 0 && (
        <Grid item xs={type === 'MOTIF' ? 6 : 4} sx={{height: '100%'}}>
          <GeneTable columns={tfColumns} data={tfRows} isMobile={isMobile} />
        </Grid>
      )}
      </Grid>
    </Paper>
  );
}
DataDetailsPanel.propTypes = {
  visible: PropTypes.bool.isRequired,
  data: PropTypes.object.isRequired,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  isMobile: PropTypes.bool,
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
    minWidth: 48,
    maxWidth: 68,
  },
  nameCell: {
    width: '30%',
    maxWidth: 0,
  },
  minOrthologousIdCell: {
    width: '35%',
  },
  maxFDRCell: {
    width: '35%',
  },
  // nesCell: {
  //   minWidth: 75,
  //   maxWidth: 80,
  // },
  // candidateTargetGenesCell: {
  //   minWidth: 70,
  //   maxWidth: 75,
  // },
  // transcriptionFactorsCell: {
  //   minWidth: 48,
  //   maxWidth: 52,
  //   paddingRight: `${theme.spacing(0.5)} !important`,
  // },
  // selectedCell: {
  //   backgroundColor: theme.palette.action.selected,
  // },
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

function GeneTable({ columns, data, isMobile }) {
  const classes = useGeneTableStyles();

  return (
    <Paper variant="outlined" className={classes.paper} sx={{height: '100%'}}>
      <Table size="small">
        <TableHead>
          <TableRow className={classes.headerRow}>
          {columns.map((col, idx) => (
            <Tooltip key={col.id} title={col.tooltip || ''}>
              <TableCell
                align="left"
                // sortDirection={orderBy === col.id ? order : false}
                className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true, [classes.tableHeaderCell]: true })}
              >
                <TableSortLabel 
                  // active={orderBy === col.id}
                  // direction={orderBy === col.id ? order : 'asc'}
                  // onClick={(event) => handleRequestSort(event, col.id)}
                >
                  { typeof col.label === 'function' ? col.label() : col.label }
                </TableSortLabel>
              </TableCell>
            </Tooltip>
          ))}
          </TableRow>
        </TableHead>
        <TableBody>
        {data?.map((row, rowIdx) => (
          <TableRow key={`row-${rowIdx}`} className={classes.tableRow}>
          {columns.map((col, idx) => (
            <TableCell
              key={rowIdx + '_' + idx}
              align={col.numeric ? 'right' : 'left'}
               className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true })}
            >
              {col.render(row, col, classes)}
            </TableCell>
          ))}
          </TableRow>
        ))}
        </TableBody>
      </Table>
    </Paper>
    // <Paper variant="outlined" className={classes.infoBox} sx={{height: '100%'}}>
    //   <List
    //     dense
    //     subheader={<ListSubheader className={classes.subheader}>Targets &#40;{data.candidateTargetGenes.length}&#41;</ListSubheader>}
    //   >
    //   {data.map(({ row }, idx) => (
    //     <ListItem key={`target-${idx}`} className={classes.listItem}>
    //       <ListItemIcon className={classes.listItemIcon}>
    //         <LabelImportantIcon className={classes.listItemIconIcon} />
    //       </ListItemIcon>
    //       <ListItemText className={classes.listItemText} primary={geneID.name} secondary={rank} />
    //     </ListItem>
    //   ))}
    //   </List>
    // </Paper>
  );
}
GeneTable.propTypes = {
  columns: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
  isMobile: PropTypes.bool,
};

export default DataDetailsPanel;