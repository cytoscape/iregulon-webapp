import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { useQuery } from "react-query";
import chroma from 'chroma-js';
import { linkoutProps } from '../defaults';
import { NetworkEditorController } from './controller';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';
import withStyles from '@mui/styles/withStyles';

import { Virtuoso } from 'react-virtuoso';
import { List, ListItem, ListItemText, ListItemIcon, ListSubheader } from '@mui/material';
import { Box, Grid, Paper, Typography, Link, Tooltip } from '@mui/material';
import Skeleton from '@mui/material/Skeleton';

import { NODE_COLOR_REGULATED, NODE_COLOR_REGULATOR } from './network-style';

import InfoIcon from '@mui/icons-material/Info';
import SadFaceIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CircleIcon from '@mui/icons-material/Circle';
import HexagonIcon from '@mui/icons-material/Hexagon';


//==[ GeneIcon ]======================================================================================================

const regulatoryFunctions = {
  regulator: { label: 'Regulator', icon: <HexagonIcon sx={{ color: NODE_COLOR_REGULATOR }} /> },
  regulated: { label: 'Regulated', icon: <CircleIcon sx={{ color: NODE_COLOR_REGULATED }} /> },
};

const GeneIcon = ({ symbol, regulatoryFunction, isMobile, controller }) => {
  const [inNetwork, setInNetwork] = React.useState(false);

  const selector = `[name="${symbol}"]`;

  const updateInNetwork = () => {
    const nodes = controller.cy.nodes(selector);
    setInNetwork(nodes.length > 0);
  };

  useEffect(() => {
    updateInNetwork();
    controller.cy.on('add remove', selector, updateInNetwork);
    return () => {
      controller.cy.removeListener('add remove', selector, updateInNetwork);
    };
  }, []);

  const RegFnTooltip = withStyles(theme => ({
    tooltipPlacementTop: {
      marginBottom: 8,
    },
    tooltipPlacementRight: {
      marginTop: -2,
      marginLeft: 3,
    },
  }))(Tooltip);

  return (
    <>
    {regulatoryFunction && regulatoryFunction !== 'unknown' &&  (
      <RegFnTooltip arrow title={regulatoryFunction} enterDelay={750} placement={isMobile ? 'top' : 'right'}>
        <Box sx={{opacity: (inNetwork ? 1.0 : 0.1)}}>
          {regulatoryFunctions[regulatoryFunction].icon}
        </Box>
      </RegFnTooltip>
    )}
    </>
  );
};
GeneIcon.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  symbol: PropTypes.string.isRequired,
  regulatoryFunction: PropTypes.string,
  isMobile: PropTypes.bool.isRequired,
};

//==[ GeneMetadataPanel ]=============================================================================================

const getSourceHref = (source, sourceId) => {
  if (source === 'AllianceGenome') {
    return `https://www.alliancegenome.org/gene/${sourceId}`;
  } else if (source === 'Araport') {
    return `https://bar.utoronto.ca/thalemine/portal.do?externalids=${sourceId}`;
  } else if (source === 'ASAP') {
    return `https://asap.genetics.wisc.edu/asap/feature_info.php?FeatureID=${sourceId}`;
  } else if (source === 'FLYBASE') {
    return `https://flybase.org/reports/${sourceId}.htm`;
  } else if (source === 'HGNC') {
    return `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${sourceId}`;
  } else if (source === 'FungiDB') {
    return `https://fungidb.org/fungidb/app/record/gene/${sourceId}`;
  } else if (source === 'MGI') {
    return `http://www.informatics.jax.org/marker/${sourceId}`;
  } else if (source === 'RGD') {
    return `https://rgd.mcw.edu/rgdweb/report/gene/main.html?id=${sourceId}`;
  } else if (source === 'SGD') {
    return `https://www.yeastgenome.org/locus/${sourceId}`;
  } else if (source === 'ZFIN') {
    return `https://zfin.org/${sourceId}`;
  }
  return null;
};

const useGeneMetadataPanelStyles = makeStyles((theme) => ({
  geneName: {
    color: 'inherit', 
  },
  geneMetadata: {
    fontSize: '1.0em',
    marginLeft: '0.6em',
    marginBottom: '0.25em',
    padding: '0.25em 1.2em 0 0.85em',
    borderWidth: 1,
    borderColor: theme.palette.divider,
    borderStyle: 'hidden hidden hidden solid',
  },
  linkout: {
    fontSize: '0.75rem',
  },
  loadingMsg: {
    color: theme.palette.text.disabled,
    animationName: '$blinker',
    animationDuration: '1000ms',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: 'ease-in-out',
  },
  errorMsg: {
    color: theme.palette.error.main,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  '@keyframes blinker': {
    from: {
      opacity: 0.5,
    },
    to: {
      opacity: 0.25,
    },
  },
}));

const GeneMetadataPanel = ({ symbol, showSymbol, motifs=[], tracks=[] }) => {
  const classes = useGeneMetadataPanelStyles();

  const queryGeneData = useQuery(
    ['gene-metadata', symbol],
    () =>
      fetch(`https://api.ncbi.nlm.nih.gov/datasets/v1/gene/symbol/${symbol}/taxon/9606`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
    .then(res => res.json()),
    {
      retry: 2,
      retryDelay: 3000,
      staleTime: 24 * 3600000, // After 24 hours, the cached data becomes stale and a refetch can happen
    }
  );

  const data = queryGeneData.data;
  const isLoading = queryGeneData.isLoading;

  let error = queryGeneData.error;
  let description, source, sourceId, sourceHref, ncbiId, synonyms;
  
  if (!isLoading && !error && data) {
    const entry = data.genes && data.genes.length > 0 ? data.genes[0] : {};

    if (entry.warnings && entry.warnings.length > 0) {
      error = { message: entry.warnings[0].reason };
    } else {
      const gene = entry.gene;

      if (gene) {
        description = gene.description;
        ncbiId = gene['gene_id'];
        source = gene['nomenclature_authority']?.authority;
        sourceId = gene['nomenclature_authority']?.identifier;
        sourceHref = getSourceHref(source, sourceId);
        synonyms = gene.synonyms;
      }
    }
  }

  return (
    <Grid container color="textSecondary" className={classes.geneMetadata}>
      { showSymbol && showSymbol() && (
        <Typography variant="body2" color="textPrimary" className={classes.geneName}>
          {symbol}
        </Typography>
      )}
      {error && (
        <span className={classes.errorMsg}>
            <ErrorOutlineIcon fontSize="small" style={{marginRight: '10px'}} />
            <Typography variant="body2">
              {error.message ? error.message : 'Unable to fetch description'}
            </Typography>
        </span>
      )}
      {!error && (
        <>
          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary" className={isLoading ? classes.loadingMsg : null}>
              {isLoading ? 'Loading...' : description }
            </Typography>
          </Grid>
        {!isLoading && (
          <>
          {source && sourceId && (
            <Grid item xs={12} sx={{marginTop: 1}}>
              <Typography variant="body2" color="textSecondary" sx={{fontSize: '0.75rem'}}>
                Source:&nbsp;&nbsp;
                <Link
                  href={sourceHref}
                  className={classes.linkout}
                  {...linkoutProps}
                >
                  {source} &mdash; {sourceId}
                </Link>
              </Typography>
            </Grid>
          )}
          {synonyms && synonyms.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="body2" component="div" color="textSecondary" sx={{fontSize: '0.75rem'}}>
                Synonyms:&nbsp;&nbsp;
                <span>{synonyms.join(', ')}</span>
              </Typography>
            </Grid>
          )}
            <Grid item xs={12}>
              <Typography variant="body2" component="div" color="textSecondary" sx={{fontSize: '0.75rem', mt: 1}}>
                Motifs:&nbsp;&nbsp;{motifs.length}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" sx={{fontSize: '0.75rem'}}>
                Tracks:&nbsp;&nbsp;{tracks.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sx={{marginTop: 1}}>  
              <Grid container direction="row" justifyContent="space-between" alignItems='center'>
                <Grid item>
                  <Link
                    href={ncbiId ? `https://www.ncbi.nlm.nih.gov/gene/${ncbiId}` : `https://www.ncbi.nlm.nih.gov/gene?term=(${symbol}%5BGene%20Name%5D)%20AND%209606%5BTaxonomy%20ID%5D`}
                    className={classes.linkout}
                    {...linkoutProps}
                  >
                    More Info
                  </Link>
                </Grid>
                <Grid item>
                  <Link
                    href={`https://genemania.org/search/human/${symbol}`}
                    className={classes.linkout}
                    {...linkoutProps}
                  >
                    Related Genes
                  </Link>
                </Grid>
              </Grid>
            </Grid>
          </>
        )}
        </>
      )}
    </Grid>
  );
};
GeneMetadataPanel.propTypes = {
  symbol: PropTypes.string.isRequired,
  showSymbol: PropTypes.func,
  motifs: PropTypes.array,
  tracks: PropTypes.array,
};

//==[ NoResultsBox ]==================================================================================================

const useNoResultsBoxStyles = makeStyles((theme) => ({
  mainIcon: {
    fontSize: '4em',
  },
  noResultsBox: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: theme.spacing(2),
    textAlign: 'center',
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
}));

const NoResultsBox = ({ isSearch }) => {
  const classes = useNoResultsBoxStyles();

  return (
    <Paper className={classes.noResultsBox}>
      <Typography component="p" className={classes.noResultsLine}>
        { isSearch ? <SadFaceIcon className={classes.mainIcon} /> : <InfoIcon className={classes.mainIcon} /> }
      </Typography>
      <Typography
        component="p"
        variant="subtitle1"
        className={classes.noResultsLine}
        style={{fontSize: '1.5em'}}
      >
       No genes found
      </Typography>
    </Paper>
  );
};
NoResultsBox.propTypes = {
  isSearch: PropTypes.bool,
};

//==[ GeneListPanel ]=================================================================================================

const useGeneListPanelStyles = makeStyles((theme) => ({
  geneName: {
    color: 'inherit',
    width: '100px',
    whiteSpace:'nowrap', 
    overflow:'hidden', 
    textOverflow:'ellipsis'
  },
  listItem: {
    paddingTop: 4,
    paddingBottom: 0,
    backgroundColor: theme.palette.background.paper,
  },
  listItemText: {
    marginTop: 0,
    marginBottom: 0,
  },
  listItemHeader: {
    height: 24,
    margin: 0,
    borderRadius: 4,
    flexWrap: 'nowrap',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    cursor: 'pointer',
    '&[disabled]': {
      color: theme.palette.divider,
      cursor: 'default',
      '&:hover': {
        textDecoration: 'none',
      },
    },
  },
  listItemHeaderSelected: {
    backgroundColor: theme.palette.action.selected,
    '&:hover': {
      backgroundColor: chroma(theme.palette.action.selected).alpha(chroma(theme.palette.action.hover).alpha() + chroma(theme.palette.action.selected).alpha()).css(),
    },
  },
  bulletIconContainer: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  bulletIcon: {
    marginRight: '4px',
    color: 'inherit',
    opacity: 0.5
  },
  regFunctionContainer: {
    width: 24,
    margin: 'auto 0 auto 0',
  },
  upDownBar: {
    border: `1px solid ${theme.palette.divider}`,
  },
}));

const GeneListPanel = ({ 
  controller,
  genes,
  selectedGene,
  initialIndex = -1,
  isSearch = false,
  isMobile,
  onGeneClick,
}) => {
  const classes = useGeneListPanelStyles();
  const theme = useTheme();

  const virtuosoRef = useRef();

  useEffect(() => {
    // Check whether we need to change scroll the list to the required index
    if (genes != null && initialIndex >= 0 &&
        genes.length > initialIndex &&
        virtuosoRef && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: initialIndex, behavior: 'auto' });
    }
  });

  if (isSearch && genes && genes.length === 0) {
    return <NoResultsBox isSearch={isSearch} />;
  }

  const renderGeneRow = (idx) => {
    const g = genes != null && genes.length > 0 ? genes[idx] : null;
    const symbol = g?.name;
    const regulatoryFunction = g?.regulatoryFunction;
    const motifs = g?.motifs;
    const tracks = g?.tracks;

    const isGeneTextOverflowing = (id) => {
      const elem = document.getElementById(id);

      if (elem) {
        const { overflow } = elem.style;

        if (!overflow || overflow === "visible")
          elem.style.overflow = "hidden";

        const isOverflowing = elem.clientWidth < elem.scrollWidth || elem.clientHeight < elem.scrollHeight;
        elem.style.overflow = overflow;

        return isOverflowing;
      }

      return false;
    };

    const loading = genes == null;
    const isSelected = !loading && selectedGene != null && selectedGene === symbol;
    const geneTextElemId = `gene_${idx}`;

    const handleGeneClick = (symbol) => {
      if (!loading)
        onGeneClick(symbol);
    };

    return (
      <ListItem key={idx} alignItems="flex-start" className={classes.listItem}>
        <ListItemText
          className={classes.listItemText}
          primary={
            <Grid container direction="column" alignItems='flex-start'>
              <Grid
                container
                direction="row"
                justifyContent="flex-start"
                alignItems='center'
                disabled={loading}
                className={clsx(classes.listItemHeader, { [classes.listItemHeaderSelected]: isSelected })}
                onClick={() => handleGeneClick(symbol)}
              >
                <Grid item className={classes.bulletIconContainer}>
                  {isSelected ?
                    <KeyboardArrowDownIcon fontSize="small" className={classes.bulletIcon} />
                  :
                    <KeyboardArrowRightIcon fontSize="small" className={classes.bulletIcon} />
                  }
                </Grid>
                <Grid item xs={12}>
                  <Typography id={geneTextElemId} variant="body2" color="textPrimary" className={classes.geneName}>
                    {loading ? <Skeleton variant="text" width={72} height="1.5rem" /> : symbol }
                  </Typography>
                </Grid>
                <Grid item className={classes.regFunctionContainer}>
                {loading ?
                  <Skeleton variant="circular" width={24} height={24} />
                  :
                  regulatoryFunction && regulatoryFunction !== 'unknown' && (
                    <GeneIcon symbol={symbol} regulatoryFunction={regulatoryFunction} isMobile={isMobile} controller={controller} />
                  )
                }
                </Grid>
              </Grid>
            {isSelected && (
              <GeneMetadataPanel
                symbol={symbol}
                showSymbol={() => isGeneTextOverflowing(geneTextElemId)}
                motifs={motifs}
                tracks={tracks}
              />
            )}
            </Grid>
          }
        />
      </ListItem>
    );
  };

  const totalGenes = genes != null ? genes.length : 30/*(for the loading Skeletons)*/;

  return (
    <Virtuoso
      ref={virtuosoRef}
      totalCount={totalGenes}
      itemContent={idx => renderGeneRow(idx)}
      overscan={200}
      style={{ background: theme.palette.background.paper }} // fixes scrollbar colour on chrome
    />
  );
};
GeneListPanel.propTypes = {
  controller: PropTypes.instanceOf(NetworkEditorController).isRequired,
  genes: PropTypes.array,
  selectedGene: PropTypes.string,
  initialIndex: PropTypes.number,
  isSearch: PropTypes.bool,
  isMobile: PropTypes.bool,
  onGeneClick: PropTypes.func.isRequired,
};

export default GeneListPanel;