import React, { forwardRef, useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { DEFAULT_PADDING, dataTableHeight } from '../defaults';
import { NetworkEditorController } from './controller';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { TableVirtuoso } from 'react-virtuoso';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel } from '@mui/material';
import { Paper, Typography, Link, Tooltip } from '@mui/material';
import { List, ListSubheader, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Checkbox } from '@mui/material';

import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SadFaceIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';


const useStyles = makeStyles((theme) => ({
  noResultsBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    overflowY: 'scroll',
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    color: theme.palette.text.disabled,
  },
  noResultsInfoBox: {
    width: '100%',
    maxWidth: 360,
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: 16,
    color: theme.palette.text.disabled,
  },
  noResultsLine: {
    marginTop: theme.spacing(1),
  },
  noResultsSubheader: {
    lineHeight: '1.25em',
    textAlign: 'left',
    marginBottom: theme.spacing(2),
    color: theme.palette.text.disabled,
  },
  noResultsItem: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  noResultsItemIcon: {
    minWidth: 'unset',
  },
  noResultsItemIconIcon: {
    transform: 'scaleX(-1)',
    fontSize: '1em',
    marginRight: theme.spacing(1),
    opacity: 0.5,
  },
  noResultsItemText: {
    margin: 0,
  },
  headerRow: {
    height: 40,
    backgroundColor: theme.palette.background.default,
  },
  tableHeaderCell: {
    borderLeft: '1px solid transparent',
    borderImage: `linear-gradient(to bottom, transparent 25%,${theme.palette.divider} 25%,${theme.palette.divider} 75%,transparent 75%)`,
    borderImageSlice: 5,
    cursor: 'default !important',
  },
  tableCell: {
    // --> WHATCH OUT! `padding[Top|Bottom]: 0` may cause a defect where the
    //     TableVirtuoso's initialTopMostItemIndex prop doesn't work
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: `${theme.spacing(0.5)} !important`,
    paddingRight: theme.spacing(0.5),
    // <------------------------------------------------------------
    borderBottom: `1px solid ${theme.palette.table.divider}`,
    cursor: 'pointer',
  },
  currentRow: {
    backgroundColor: `${theme.palette.primary.main} !important`,
  },
  inNetworkCell: {
    borderLeft: 'none',
    paddingLeft: '1px !important',
    paddingRight: '1px !important',
    textAlign: 'center',
  },
  rankCell: {
    minWidth: 58,
    maxWidth: 60,
  },
  nameCell: {
    width: '90%',
    maxWidth: 0,
    alignItems: 'center',
  },
  nesCell: {
    minWidth: 75,
    maxWidth: 80,
  },
  aucCell: {
    minWidth: 75,
    maxWidth: 80,
  },
  candidateTargetGenesCell: {
    minWidth: 70,
    maxWidth: 75,
  },
  transcriptionFactorsCell: {
    minWidth: 48,
    maxWidth: 52,
    paddingRight: `${theme.spacing(0.5)} !important`,
  },
  selectedCell: {
    backgroundColor: theme.palette.action.selected,
  },
  nameCellText: {
    alignItems: 'center',
    textWrap: 'pretty',
    marginRight: 2,
    cursor: 'pointer',
  },
  upDownBar: {
    border: `1px solid ${theme.palette.divider}`,
  },
  link: {
    marginLeft: theme.spacing(0.5),
    "&[disabled]": {
      color: theme.palette.text.secondary,
      cursor: "default",
      "&:hover": {
        textDecoration: "none"
      }
    }
  },
  openInNewIcon: {
    fontSize: '1rem',
  },
}));

const PRECISION = 3;

const NAME_LABELS = { MOTIF: 'Enriched Motif', TRACK: 'Enriched Track', CLUSTER: 'Transcription Factor' };

const COLUMNS = [
  {
    id: 'inNetwork', // Special column for checkboxes
    numeric: false,
    hideOnMobile: false,
    label: '',
    show: () => true,
    render: () => <></>,
  },
  { 
    id: 'rank',
    numeric: true,
    hideOnMobile: false,
    label: 'Rank',
    tooltip: (type) => `The ${type.toLowerCase()} is ranked using the Normalized Enrichment Score (NES)`,
    show: (type) => type !== 'CLUSTER',
    render: (row, col, classes) => {
      return (
        <>{ row[col.id] }</>
      );
    }
  },
  { 
    id: 'name',
    numeric: false,
    hideOnMobile: false,
    label: (type) => NAME_LABELS[type],
    show: () => true,
    render: (row, col, classes) => {
      return (
        <div className={classes.nameCellText}>
        {row.db && (
          <Typography component="span" variant="caption" sx={{color: theme => theme.palette.text.disabled}}>{ row['db']}:&nbsp;&nbsp;</Typography>
        )}
          {row[col.id] }
        {row.href && (
          <Tooltip title={row.db}>
            <Link
              href={row.href}
              color="textSecondary"
              className={classes.link}
              onClick={(evt) => evt.stopPropagation()}
              {...linkoutProps}
            >
              <OpenInNewIcon className={classes.openInNewIcon} />
            </Link>
          </Tooltip>
        )}
        </div>
      );
    }
  },
  {
    id: 'clusterCode',
    numeric: false, 
    hideOnMobile: false,
    label: 'Cluster',
    tooltip: (type) => <>
            {type === 'MOTIF' && <>Motifs are clustered by similarity</>}
            {type === 'TRACK' && <>Tracks are clustered by transcription factor</>}
            {type === 'CLUSTER' && <>Motifs are clustered by similarity and tracks are clustered by transcription factor</>}
            </>,
    show: () => true,
    render: (row, col) =>  <>{ row[col.id] }</>
  },
  {
    id: 'nes',
    numeric: true, 
    hideOnMobile: false,
    label: 'NES',
    tooltip: (type) => type === 'CLUSTER' ? "The highest NES of the cluster's motifs/tracks" : 'Normalized Enrichment Score (the higher the score, the better)',
    show: () => true,
    render: (row, col, classes, controller) => {
      const node = controller.cy.nodes(`[id = "${row.id}"]`);
      const nesColor = controller.style.getNodeColor(node);
      return <>{roundNumber(row[col.id]).toFixed(PRECISION)}</>;
      // return (
      //   <UpDownHBar
      //     value={row[col.id]}
      //     minValue={-controller.style.magNES}
      //     maxValue={controller.style.magNES}
      //     color={nesColor}
      //     bgColor={useTheme().palette.background.default}
      //     height={CHART_HEIGHT}
      //     text={roundNumber(row[col.id]).toFixed(PRECISION)}
      //     className={classes.upDownBar}
      //   />
      // );
    }
  },
  {
    id: 'auc',
    numeric: true, 
    hideOnMobile: false,
    label: 'AUC',
    tooltip: "Area Under the Curve",
    show: (type) => type !== 'CLUSTER',
    render: (row, col, classes, controller) => {
      return <>{roundNumber(row[col.id]).toFixed(PRECISION)}</>;
    }
  },
  {
    id: 'candidateTargetGenes',
    numeric: true,
    hideOnMobile: false,
    label: 'Targets',
    tooltip: (type) => type === 'CLUSTER' ? "Number of unique target genes detected by the TF's motifs/tracks (UNION)" : 'Number of unique target genes',
    show: () => true,
    render: (row, col) => (
      <Tooltip title={row[col.id].map((tf) => tf.geneID.name).sort((a, b) => a.localeCompare(b)).join(', ')}>
        <span>{ row[col.id].length }</span>
      </Tooltip>
    )
  },
  {
    id: 'transcriptionFactors',
    numeric: true,
    hideOnMobile: false,
    label: 'TFs',
    tooltip: "Number of associated transcription factors",
    show: (type) => type !== 'CLUSTER',
    render: (row, col) => (
      <Tooltip title={row[col.id].map((tf) => tf.geneID.name).sort((a, b) => a.localeCompare(b)).join(', ')}>
        <span>{ row[col.id].length }</span>
      </Tooltip>
    )
  },
  {
    id: 'motifsAndTracks',
    numeric: true,
    hideOnMobile: false,
    label: 'Motifs/Tracks',
    tooltip: 'Number of motifs/tracks that can be associated with the TF',
    show: (type) => type === 'CLUSTER',
    render: (row, col) => (
      <Tooltip title={row[col.id].map((mt) => mt.name).sort((a, b) => a.localeCompare(b)).join(', ')}>
        <span>{ row[col.id].length }</span>
      </Tooltip>
    )
  },
];

const CHART_HEIGHT = 16;

const TableComponents = {
  Scroller: forwardRef((props, ref) => <TableContainer component={Paper} {...props} ref={ref} />),
  Table: (props) => <Table size="small" {...props} style={{ borderCollapse: 'separate' }} />,
  TableHead: TableHead,
  TableRow: forwardRef((props, ref) => <TableRow {...props} hover ref={ref} />),
  TableBody: forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
};
TableComponents.Scroller.displayName = "Scroller";   // for linting rule (debugging purposes)
TableComponents.TableRow.displayName = "TableRow"; // for linting rule (debugging purposes)
TableComponents.TableBody.displayName = "TableBody"; // for linting rule (debugging purposes)

const linkoutProps = { target: "_blank",  rel: "noreferrer", underline: "hover" };

const DEF_ORDER = 'asc';
const DEF_ORDER_BY = 'rank';

export const comparator = (a, b, orderBy) => {
  const aVal = a[orderBy], bVal = b[orderBy];

  // null values come last in ascending!
  if (aVal == null) {
    return 1;
  }
  if (bVal == null) {
    return -1;
  }
  if (typeof aVal === 'string' && typeof bVal === 'string') {
    if (orderBy === 'name') {
      const v1 = a['db'] + '__' + aVal;
      const v2 = b['db'] + '__' + bVal;
      return v1.localeCompare(v2, undefined, { sensitivity: 'accent' });
    }
    return aVal.localeCompare(bVal, undefined, { sensitivity: 'accent' });
  }
  if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
    if (aVal && !bVal) {
      return -1;
    }
    if (!aVal && bVal) {
      return 1;
    }
    return 0;
  }
  if (aVal < bVal) {
    return -1;
  }
  if (aVal > bVal) {
    return 1;
  }
  return 0;
};

export const getComparator = (order, orderBy) => {
  return order === 'asc'
    ? (a, b) => comparator(a, b, orderBy)
    : (a, b) => comparator(b, a, orderBy);
};

const stableSort = (rows, comparator) => {
  const stabilizedThis = rows.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
};

export const DEF_SORT_FN = (rows) => stableSort(rows, getComparator(DEF_ORDER, DEF_ORDER_BY));

const roundNumber = (val) => {
  return val != null ? (Math.round(val * Math.pow(10, PRECISION)) / Math.pow(10, PRECISION)) : 0;
};

const gotoNode = (id, cy) => {
  const eles = cy.nodes(`[id = "${id}"]`);
  cy.animate({
    fit: { eles: eles, padding: DEFAULT_PADDING },
    easing: 'ease-out',
    duration: 250
  });
};

//==[ ContentRow ]====================================================================================================

const ContentRow = ({ row, index, selected, current, controller, isMobile, onCheck, onClick }) => {
  const classes = useStyles();

  // const handleClick = (evt) => {
  //   onClick?.(row);
  //   evt.preventDefault();
  // };

  return (
    <>
    {COLUMNS.map((col, idx) => (
      (!isMobile || !col.hideOnMobile) && col.show(row.type) && (
        <TableCell
          key={col.id + '_' + index + '_' + idx}
          align={col.numeric ? 'right' : 'left'}
          // selected={selected}
          className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true, /*[classes.selectedCell]: selected*/ })}
          onClick={() => col.id !== 'inNetwork' && onClick?.(row)}
        >
        {col.id === 'inNetwork' ? 
          <Checkbox
            sx={{ width: 24, height: 24 }}
            disabled={row['transcriptionFactors'].length === 0}
            checked={row['inNetwork']}
            onClick={() => onCheck(row)}
          /> 
        :
          col.render(row, col, classes, controller)
        }
        </TableCell>
      )
    ))}
    </>
  );
};
ContentRow.propTypes = {
  row: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  selected: PropTypes.bool,
  current: PropTypes.bool,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  isMobile: PropTypes.bool,
  onCheck: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
};

//==[ DataTable ]=====================================================================================================

export function DataTable({
  visible,
  data,
  type,
  checkedRows = [],
  selectedRows = [],
  currentRow,
  gotoCurrentNode,
  scrollToId,
  searchTerms,
  controller,
  isMobile,
  onRowCheckChange,
  onRowClick,
  onDataSort,
}) {
  const [order, setOrder] = useState(DEF_ORDER);
  const [orderBy, setOrderBy] = useState(DEF_ORDER_BY);

  const classes = useStyles();
  const theme = useTheme();
  
  const cy = controller.cy;
  
  const virtuosoRef = useRef();
  const sortedDataRef = useRef();
  sortedDataRef.current = stableSort(data, getComparator(order, orderBy));
  const selectedRowsRef = useRef(selectedRows); // Will be used to prevent the table from auto-scrolling to the clicked row

  data.forEach((row) => {
    const inNetwork = checkedRows.findIndex(r => r.id === row.id) >= 0;
    row.inNetwork = inNetwork;
  });

  // Sorting
  useEffect(() => {
    const comparator = getComparator(order, orderBy);
    const sortedData = stableSort(data, comparator);
    sortedDataRef.current = sortedData;
    onDataSort?.(anyData => stableSort(anyData, comparator));
  }, [order, orderBy]);
  // Scroll to
  useEffect(() => {
    if (scrollToId && virtuosoRef.current) {
      const index = sortedDataRef.current.findIndex(obj => obj.id === scrollToId);
      const offset = index > 0 ? -15 : 0; // So the user can see that there are more rows above this one
      virtuosoRef.current.scrollToIndex({ index, align: 'start', offset });
    }
  }, [scrollToId]);
  // Current item
  useEffect(() => {
    if (currentRow && gotoCurrentNode) {
      gotoNode(currentRow.id, cy);
    }
  }, [currentRow, gotoCurrentNode]);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const isRowSelected = (row) => {
    return selectedRows.findIndex(r => r.id === row.id) >= 0;
  };

  const handleRowClick = (row, preventGotoNode = false) => {
    let newSelectedRows = [];
    let selected = false;

    if (!isRowSelected(row)) {
      // Toggle: unselect this row/id
      newSelectedRows.push(row);
      selectedRowsRef.current = [...newSelectedRows];
      selected = true;
    }

    onRowClick?.(row, selected, preventGotoNode);
    // let newSelectedRows = selectedRows;
    // let selected = false;

    // if (isRowSelected(row)) {
    //   // Toggle: unselect this row/id
    //   newSelectedRows = newSelectedRows.filter(r => r.id !== row.id);
    //   selectedRowsRef.current = [...newSelectedRows];
    // } else {
    //   // Add this id to the selection list
    //   newSelectedRows.push(row);
    //   newSelectedRows = stableSort(data, getComparator(order, orderBy)); // Don't forget to sort it again!
    //   selectedRowsRef.current = [...newSelectedRows];
    //   selected = true;
    // }

    // onRowSelectionChange?.(row, selected, preventGotoNode);
  };

  const isRowChecked = (row) => {
    return checkedRows.findIndex(r => r.id === row.id) >= 0;
  };

  const handleRowCheck = (row) => {
    const checked = !isRowChecked(row);
    onRowCheckChange?.(row, checked);
  };

  if (data.length === 0 && searchTerms && searchTerms.length > 0) {
    return (
      <Paper className={classes.noResultsBox} sx={{height: dataTableHeight(theme)}}>
        <Typography component="p" className={classes.noResultsLine}>
          <SadFaceIcon style={{fontSize: '4em'}} />
        </Typography>
        <Typography
          component="p"
          variant="subtitle1"
          className={classes.noResultsLine}
          style={{fontSize: '1.5em'}}
        >
           No {type}s found
        </Typography>
        <Paper variant="outlined" className={classes.noResultsInfoBox}>
          <List
            dense
            subheader={
              <ListSubheader className={classes.noResultsSubheader}>
                The {type} you are looking for:
              </ListSubheader>
            }
          >
            <ListItem className={classes.noResultsItem}>
              <ListItemIcon className={classes.noResultsItemIcon}>
                <KeyboardReturnIcon className={classes.noResultsItemIconIcon} />
              </ListItemIcon>
              <ListItemText className={classes.noResultsItemText} primary="is not in our database" />
            </ListItem>
            <ListItem className={classes.noResultsItem}>
              <ListItemIcon className={classes.noResultsItemIcon}>
                <KeyboardReturnIcon className={classes.noResultsItemIconIcon} />
              </ListItemIcon>
              <ListItemText className={classes.noResultsItemText} primary="or it has not been enriched" />
            </ListItem>
          </List>
        </Paper>
      </Paper>
    );
  }

  const totalRows = sortedDataRef.current.length;
  const totalSelectedRows = selectedRows.length;
  const allSelected = totalSelectedRows > 0 && totalSelectedRows === totalRows;

  // Find the "current" id
  let currentId = currentRow ? currentRow.id : null;
  // Find the "initial" index, which is where the table must auto-scroll to
  let initialIndex = 0;
  let initialId = scrollToId || currentId;
  const initialTopMostItemIndex = { index: 0, align: 'start' };
  if (!initialId && totalSelectedRows > 0) {
    initialId = selectedRows[0].id;
  }
  if (initialId && sortedDataRef.current) {
    initialIndex = sortedDataRef.current.findIndex(obj => obj.id === initialId);
    if (initialIndex > 0) {
      // Small offset to show the previous row so the user can see that there are more rows above this one
      initialTopMostItemIndex.offset = -15;
    }
    initialTopMostItemIndex.index = initialIndex;
  }

  return (
    <TableVirtuoso
      ref={virtuosoRef}
      data={sortedDataRef.current}
      initialTopMostItemIndex={initialTopMostItemIndex}
      style={{
        display: visible ? 'block' : 'none',
        height: dataTableHeight(theme),
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.background.paper
      }}
      components={TableComponents}
      fixedHeaderContent={() => (
        <TableRow className={classes.headerRow}>
        {COLUMNS.map((col) => (
          (!isMobile || !col.hideOnMobile) && col.show(type) && (
            <Tooltip
              key={col.id}
              title={typeof col.tooltip === 'function' ? col.tooltip(type) : col.tooltip}
            >
              <TableCell
                align="left"
                sortDirection={orderBy === col.id ? order : false}
                className={clsx(classes[col.id + 'Cell'], { [classes.tableCell]: true, [classes.tableHeaderCell]: true })}
              >
                <TableSortLabel 
                  active={orderBy === col.id}
                  direction={orderBy === col.id ? order : 'asc'}
                  onClick={(event) => handleRequestSort(event, col.id)}
                >
                      { typeof col.label === 'function' ? col.label(type) : col.label }
                    {col.id === 'name' && data && (
                      <Typography component="span" variant="body2" color="textSecondary">
                        &nbsp;&#40;{totalSelectedRows > 0 ? 
                          (allSelected ? 'all' : totalSelectedRows) + ' selected of '
                          :
                        ''}{ data.length }&#41;
                      </Typography>
                    )}
                </TableSortLabel>
              </TableCell>
            </Tooltip>
          )
        ))}
        </TableRow>
      )}
      itemContent={(index, row) => (
        <ContentRow
          row={row}
          index={index}
          selected={selectedRows.findIndex(r => r.id === row.id) >= 0}
          current={currentRow && currentRow.id === row.id}
          controller={controller}
          onClick={handleRowClick}
          onCheck={handleRowCheck}
        />
      )}
    />
  );
}
DataTable.displayName = "ResultsTable"; // for linting rule (debugging purposes)
DataTable.propTypes = {
  visible: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  type: PropTypes.string.isRequired,
  checkedRows: PropTypes.array,
  selectedRows: PropTypes.array,
  currentRow: PropTypes.object,
  gotoCurrentNode: PropTypes.bool,
  scrollToId: PropTypes.string,
  searchTerms: PropTypes.array,
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  isMobile: PropTypes.bool,
  onRowCheckChange: PropTypes.func,
  onRowSelectionChange: PropTypes.func,
  onRowClick: PropTypes.func,
  onDataSort: PropTypes.func,
};

export default DataTable;