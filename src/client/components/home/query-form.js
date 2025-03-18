import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import DataConfig, { 
  DEFAULT_NES_THRESHOLD,
  DEFAULT_AUC_THRESHOLD,
  DEFAULT_RANK_THRESHOLD,
  DEFAULT_MIN_ORTHOLOGOUS_IDENTITY,
  DEFAULT_MAX_MOTIF_SIMILARITY_FDR,
  DEFAULT_OVERLAP,
  DEFAULT_UPSTREAM,
  DEFAULT_DOWNSTREAM,
  searchSpaceTypeDef,
} from '../../data-config';
import { organismParams as organisms } from '../../../util';
import { isNumeric } from '../util';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Link,
  ListItemIcon,
  ListItemText,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HelpIcon from '@mui/icons-material/Help';
import { FlyIcon, HumanIcon, MouseIcon } from '../svg-icons';


const organismIcons = {
  '1': (props) => <HumanIcon {...props} />,
  '2': (props) => <MouseIcon {...props} />,
  '3': (props) => <FlyIcon {...props} />,
  '4': (props) => <FlyIcon {...props} />,
  '5': (props) => <HumanIcon {...props} />,
  '6': (props) => <MouseIcon {...props} />,
};

const exampleGenes = {
  // Human -- genes frequently mutated in prostate cancer (from GeneMANIA)
  1: [
    'AR', 'BDH1', 'CYB5A', 'CYP11A1', 'CYP11B1', 'CYP11B2', 'CYP17A1', 'CYP19A1', 'CYP21A2',
    'DCXR', 'DECR2', 'DHRS1', 'DHRS11', 'DHRS13', 'DHRS2', 'DHRS4', 'DHRS4L2', 'DHRS7B', 'HSD11B1L',
    'HSD17B1', 'HSD17B10', 'HSD17B11', 'HSD17B12', 'HSD17B13', 'HSD17B14', 'HSD17B2', 'HSD17B3',
    'HSD17B4', 'HSD17B6', 'HSD17B7', 'HSD17B8', 'HSD3B1', 'HSD3B2', 'HSD3B7', 'HSDL1', 'HSDL2',
    'PECR', 'RDH10', 'RDH5', 'RDH8', 'SDR16C5', 'SHBG', 'SRD5A1', 'SRD5A3', 'STAR', 'TECR', 'TECRL'
  ],
  // Mouse -- genes encoding aldehyde dehydrogenases
  2: [
    'Abl1', 'Actb', 'Adora2a', 'Adora2b', 'Adora3', 'Adrb1', 'Adrb2', 'Adrb3', 'Agt', 'Aldh1a1',
    'Aldh1a2', 'Aldh1a3', 'Aldh1l1'
  ],
  // Fly -- genes encoding aminoacyl-tRNA synthetases
  3: [
    'twi', 'sna', 'dpp', 'sog', 'rho', 'pip'
  ],
};

const LABEL_MIN_WIDTH = 120;
const LABEL_MAX_WIDTH = 300;
const TXT_FIELD_MAX_WIDTH = 150;

const formControlLabelSx = (theme, isMobile) => ({
  width: '100%',
  ml: 0,
  my: isMobile ? 0.5 : 0.25,
  gap: isMobile ? 0 : 1,
  alignItems: isMobile? 'flex-start' : 'center',
  '& .MuiFormControlLabel-label': {
    fontSize: theme.typography.body2.fontSize,
    minWidth: { sm: LABEL_MIN_WIDTH },
    maxWidth: { md: LABEL_MAX_WIDTH },
    textAlign: isMobile ? 'left' : 'right',
  },
  cursor: 'default',
});


//==[ TooltipLink ]===================================================================================================

function TooltipLink({ href, children }) {
  return (
    <Link 
      href={href}
      target="_blank"
      rel="noreferrer"
      sx={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
    >
      { children }
    </Link>
  );
}
TooltipLink.propTypes = {
  title: PropTypes.string,
  href: PropTypes.string,
  children: PropTypes.node,
};

//==[ FieldHelpIcon ]=================================================================================================

function FieldHelpIcon({ title, sx }) {
  return (
    <Tooltip arrow enterDelay={500} title={title}>
      <HelpIcon
        fontSize="small"
        sx={{
          visibility: !title ? 'hidden' : 'visible',
          cursor: 'default',
          ...sx,
        }}
      />
    </Tooltip>
  );
}
FieldHelpIcon.propTypes = {
  title: PropTypes.any,
  sx: PropTypes.object,
};

//==[ FormTextField ]=================================================================================================

function FormTextField({ label, initialValue, helperText, disabled=false, isMobile, validationFn, errorMessage, onChange }) {
  const [ value, setValue ] = useState(initialValue);
  const [ error, setError ] = useState(false);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (event) => {
    setValue(event.target.value);
    if (validationFn) {
      setError(!validationFn(event.target.value));
    }
    onChange(event);
  };

  return (
    <FormControlLabel
      label={label + ':'}
      disabled={disabled}
      control={
        <>
        {!isMobile && (
          <>
            {error && errorMessage && (
              <Typography
                variant="caption"
                color="error"
                sx={{
                  width: `calc(100% - ${LABEL_MAX_WIDTH}px - ${TXT_FIELD_MAX_WIDTH}px - 24px - 12px)`,
                }}
              >
                { errorMessage }
              </Typography>
            )}
            <FieldHelpIcon
              title={helperText}
              sx={{
                mr: error && errorMessage ? 0 : `calc(100% - ${LABEL_MAX_WIDTH}px - ${TXT_FIELD_MAX_WIDTH}px - 24px - 4px)`
              }}
            />
          </>
        )}
          <TextField
            value={value}
            onChange={handleChange}
            disabled={disabled}
            autoComplete="off"
            error={error}
            fullWidth
            size="small"
            inputProps={{
              spellCheck: false,
              sx: theme => ({
                fontSize: theme.typography.body2.fontSize,
                textAlign: 'right',
              })
            }}
            sx={theme => ({
              backgroundColor: theme.palette.background.paper,
              fontSize: theme.typography.body2.fontSize,
              maxWidth: TXT_FIELD_MAX_WIDTH,
            })}
          />
        </>
      }
      labelPlacement={isMobile ? 'top' : 'start'}
      sx={(theme) => formControlLabelSx(theme, isMobile)}
    />
  );
}
FormTextField.propTypes = {
  label: PropTypes.string.isRequired,
  initialValue: PropTypes.any,
  helperText: PropTypes.any,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  isMobile: PropTypes.bool,
  validationFn: PropTypes.func,
  errorMessage: PropTypes.any,
  onChange: PropTypes.func,
};

//==[ FormSelect ]====================================================================================================

function FormSelect({ label, options, initialValue, helperText, disabled=false, isMobile, onChange }) {
  const [ entries, setEntries ] = useState([]);
  const [ value, setValue ] = useState('');

  useEffect(() => {
    setEntries(Object.entries(options));
    setValue(initialValue);
  }, [options, initialValue]);

  const handleChange = (event) => {
    setValue(event.target.value);
    onChange(event);
  };

  return (
    <FormControlLabel
      label={label + ':'}
      disabled={disabled || entries.length < 2}
      control={
        <>
        {!isMobile && (
          <FieldHelpIcon title={helperText} />
        )}
          <Select
            value={value}
            onChange={handleChange}
            disabled={disabled || entries.length < 2}
            fullWidth
            size="small"
            sx={theme => ({
              backgroundColor: theme.palette.background.paper,
              fontSize: theme.typography.body2.fontSize,
              fontStyle: value === '_specify' ? 'italic' : 'normal',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              maxWidth: { sm: `calc(100% - ${LABEL_MAX_WIDTH}px - 24px - 4px)`, xs: '100%' },
            })}
          >
          {entries.map(([k, v]) => (
            <MenuItem
              key={k}
              value={k}
              sx={theme => ({
                fontSize: theme.typography.body2.fontSize,
                fontStyle: k === '_specify' ? 'italic' : 'normal',
              })}
            >
              { v }
            </MenuItem>
          ))}
          </Select>
        </>
      }
      labelPlacement={isMobile ? 'top' : 'start'}
      sx={(theme) => formControlLabelSx(theme, isMobile)}
    />
  );
}
FormSelect.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
  initialValue: PropTypes.string,
  helperText: PropTypes.any,
  disabled: PropTypes.bool,
  isMobile: PropTypes.bool,
  onChange: PropTypes.func,
};

//==[ TitledFormGroup ]===============================================================================================

function TitledFormGroup({ title, children }) {
  return (
    <Box
      component="fieldset"
      sx={{
        width: '100%',
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Typography component="legend" fontSize="small">{ title }</Typography>
      { children }
    </Box>
  );
}
TitledFormGroup.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

//==[ QueryPanel ]====================================================================================================

function parseGeneList(text) {
  if (text.length > 0) {
    let parts = text.split(/[\s,]+/);
    parts = parts.filter(el => el.length > 0);
    return [...new Set(parts)];
  }
  return [];
}

/**
 * The array must have objects with 'id' and 'name' properties.
 */
function convertToKeyValueOptions(array) {
  const options = array.reduce((acc, cur) => {
    acc[cur.id] = cur.name;
    return acc;
  }, {});
  return options;
}

function getDefaultCollectionValue(collections) {
  const col = collections.find(c => c.default);
  return col ? col.id : 'none';
}

// Tooltips (hekper texts):

const searchSpaceTypeTooltip = <>
  The type of the regulatory search space:
  <ul>
    <li><b>Gene-Based:</b> the putative regulatory regions are defined according to the boundaries
    of the genes &#40;TSS or TTS&#41;.</li>
    <li><b>Region-Based:</b> the putative regulatory regions are defined by regulatory features 
    such as promoter regions, DHS regions, and other non coding annotated regions.</li>
  </ul>
</>;

const collectionTooltip = <>
  More details about our collections <TooltipLink href="http://iregulon.aertslab.org/collections.html#motifcolldesc">here</TooltipLink>.
</>;

const regRegionTooltip = <>Delineates in more detail the search space, i.e. the putative regulatory region.</>;

const rankingDatabaseTooltip = <>
  According to the type of the search space and the putative regions, several databases can be queried:
  <ul>
    <li>In the <em>gene-based</em> search space, it is possible to use conservation between 7 or 10 species for Motif rankings databases, 
    but not for Track rankings,</li>
    <li>In the <em>region-based</em> seach space, available for Drosophila, 136K regulatory non-coding regions using conservation 
    between 11 species &#40;as described in our <TooltipLink href="https://academic.oup.com/nar/article/40/15/e114/1223009">i-cisTarget paper</TooltipLink>&#41;.</li>
  </ul>
</>;

const overlapFractionTooltip = <>
  The fraction of the putative regulatory region associated with a gene that must overlap with the predefined regions.<br />
  This parameter must be between 0.0 and 1.0.
</>;

const regSearchSpaceTooltip = <>
  Select a predefined regulatory search space or specify the size of the region upstream/downstream of the TSS to use in the mapping to predefined regions.
</>;

const upstreamRegionTooltip = <>
  The size of the region &#40;in bp&#41; upstream of the TSS to use in the mapping to predefined regions.
</>;

const downstreamRegionTooltip = <>
  The size of the region &#40;in bp&#41; downstream of the TSS to use in the mapping to predefined regions.
</>;

const nesTooltip = <>
  This is the minimal NES score to consider a motif as being relevant.
</>;

const aucTooltip = <>
  The Area Under the Curve &#40;AUC&#41; values are calculated for all motifs at the beginning of the cumulative gene recovery plot &#40;aka ROC curve&#41;
  which plots the input gene recovery along the whole genome ranking.<br />
  This threshold indicates the percentage of the top ranked genes/regions to consider for the AUC calculation.
</>;

const rankTooltip = <>
  This is the x-axis cutoff for visualization of the ROC curve.<br />
  This value corresponds with the top genes shown on the results.
</>;

const orthologousIdTooltip = <>
  A threshold on the miniminal identity score to define gene orthology.<br />
  This %identity was calculated in <TooltipLink href="https://pubmed.ncbi.nlm.nih.gov/19029536/">EnsemblCompara gene trees</TooltipLink> based on
  whole amino acid sequence alignments &#40;tf2tf associations&#41;.<br />
  The closer the score to zero, the more homologous genes can be associated to an annotated TF. But when the threshold is set to one,
  no orthologous information is used.<br />
  This score must be between 0.0 and 1.0.
</>;

const fdrTooltip = <>
  A threshold on the maximal FDR calculated by the TOMTOM p-value for the similarity of the motifs &#40;motif2motif associations&#41;.<br />
  The closer the score to zero, the more similar motifs will be selected for association to a enriched motif. But when the threshold is set to zero,
  no motif similarity information is used.<br />
  The score must be between 0.0 and 1.0.
</>;  

export function QueryForm({ dataConfig, initialOrganism, isMobile, onOrganismChanged, onGenesChanged }) {
  const [ organismIndex, setOrganismIndex ] = useState(organisms.indexOf(initialOrganism));
  const [ showAdvancedOptions, setShowAdvancedOptions ] = useState(false);
  const [ searchSpaceTypeOptions, setSearchSpaceTypeOptions ] = useState(searchSpaceTypeDef);
  const [ searchSpaceTypeId, setSearchSpaceTypeId ] = useState('');
  const [ motifCollectionOptions, setMotifCollectionOptions ] = useState({});
  const [ motifCollectionId, setMotifCollectionId ] = useState('');
  const [ trackCollectionOptions, setTrackCollectionOptions ] = useState({});
  const [ trackCollectionId, setTrackCollectionId ] = useState('');
  const [ regRegionOptions, setRegRegionOptions ] = useState({});
  const [ regRegionId, setRegRegionId ] = useState('');
  const [ motifRankingsDbOptions, setMotifRankingsDbOptions ] = useState({});
  const [ motifRankingsDbId, setMotifRankingsDbId ] = useState('');
  const [ trackRankingsDbOptions, setTrackRankingsDbOptions ] = useState({});
  const [ trackRankingsDbId, setTrackRankingsDbId ] = useState('');
  const [ overlapFraction, setOverlapFraction ] = useState(DEFAULT_OVERLAP);
  const [ regSearchSpaceOptions, setRegSearchSpaceOptions ] = useState({});
  const [ regSearchSpaceId, setRegSearchSpaceId ] = useState('');
  const [ upstreamRegion, setUpstreamRegion ] = useState(DEFAULT_UPSTREAM);
  const [ downstreamRegion, setDownstreamRegion ] = useState(DEFAULT_DOWNSTREAM);
  const [ nes, setNES ] = useState(DEFAULT_NES_THRESHOLD);
  const [ auc, setAUC ] = useState(DEFAULT_AUC_THRESHOLD);
  const [ rank, setRank ] = useState(DEFAULT_RANK_THRESHOLD);
  const [ orthologousId, setOrthologousId ] = useState(DEFAULT_MIN_ORTHOLOGOUS_IDENTITY);
  const [ fdr, setFDR ] = useState(DEFAULT_MAX_MOTIF_SIMILARITY_FDR);

  const organismRef = useRef(organisms[organismIndex]);
  const searchSpaceTypeIdRef = useRef(searchSpaceTypeId);
  const motifCollectionIdRef = useRef(motifCollectionId);
  const trackCollectionIdRef = useRef(trackCollectionId);
  const regRegionIdRef = useRef(regRegionId);
  const motifRankingsDbIdRef = useRef(motifRankingsDbId);
  const trackRankingsDbIdRef = useRef(trackRankingsDbId);

  const geneInputRef = useRef();

  /** Type of Search Space */
  const updateSearchSpace = () => {
    const searchSpaceTypes = dataConfig.getSearchSpaceTypes(organismRef.current);
    const defSearchSpaceTypeId = searchSpaceTypes[0].id;
    searchSpaceTypeIdRef.current = defSearchSpaceTypeId;
    setSearchSpaceTypeOptions(convertToKeyValueOptions(searchSpaceTypes));
    setSearchSpaceTypeId(defSearchSpaceTypeId);
  };
  /** Motif/Track Collections */
  const updateCollections = () => {
    const motifCollections = dataConfig.getCollections(organismRef.current, searchSpaceTypeIdRef.current, 'motif');
    const defMotifCollectionId = getDefaultCollectionValue(motifCollections);
    const trackCollections = dataConfig.getCollections(organismRef.current, searchSpaceTypeIdRef.current, 'track');
    const defTrackCollectionId = getDefaultCollectionValue(trackCollections);
    motifCollectionIdRef.current = defMotifCollectionId;
    trackCollectionIdRef.current = defTrackCollectionId;
    setMotifCollectionOptions(convertToKeyValueOptions(motifCollections));
    setMotifCollectionId(defMotifCollectionId);
    setTrackCollectionOptions(convertToKeyValueOptions(trackCollections));
    setTrackCollectionId(defTrackCollectionId);
  };
  /** Putative Regulatory Region */
  const updateRegulatoryRegion = () => {
    const regRegions = dataConfig.getPutativeRegulatoryRegions(
      searchSpaceTypeIdRef.current,
      motifCollectionIdRef.current,
      trackCollectionIdRef.current,
    );
    const defRegRegionId = regRegions.length > 0 ? regRegions[0].id : '';
    regRegionIdRef.current = defRegRegionId;
    setRegRegionOptions(convertToKeyValueOptions(regRegions));
    setRegRegionId(defRegRegionId);
  };
  /** Motif/Track Rankings Databases */
  const updateRankingsDBs = () => {
    const motifRankingsDBs = dataConfig.getRankingsDatabases(
      organismRef.current,
      searchSpaceTypeIdRef.current,
      'motif',
      motifCollectionIdRef.current,
      regRegionIdRef.current
    );
    const trackRankingsDBs = dataConfig.getRankingsDatabases(
      organismRef.current,
      searchSpaceTypeIdRef.current,
      'track',
      trackCollectionIdRef.current,
      regRegionIdRef.current
    );
    const defMotifRankingsDB = motifRankingsDBs[0]; // TODO check if this is correct
    const defTrackRankingsDB = trackRankingsDBs[0]; // TODO check if this is correct
    motifRankingsDbIdRef.current = defMotifRankingsDB?.id || '';
    trackRankingsDbIdRef.current = defTrackRankingsDB?.id || '';
    setMotifRankingsDbOptions(convertToKeyValueOptions(motifRankingsDBs));
    setMotifRankingsDbId(motifRankingsDbIdRef.current);
    setTrackRankingsDbOptions(convertToKeyValueOptions(trackRankingsDBs));
    setTrackRankingsDbId(trackRankingsDbIdRef.current);

    return (defMotifRankingsDB?.id !== 'none') ? defMotifRankingsDB : defTrackRankingsDB; // TODO check if this is correct
  };
  /** Region-based specific parameters */
  const updateRegionBasedParams = () => {
    // Get motif and track rankings databases by id
    const allRankingsDBs = dataConfig.getAllRankingsDatabases();
    const motifRankingsDB = allRankingsDBs.find(db => db.id === motifRankingsDbIdRef.current);
    const trackRankingsDB = allRankingsDBs.find(db => db.id === trackRankingsDbIdRef.current);
    // Get the corresponding delineations and the default one
    let delineations = [], delineationDefault;
    if (motifRankingsDB?.collection?.type === 'motif') {
      delineations = motifRankingsDB.gene2regionDelineations || [];
      delineationDefault = motifRankingsDB.delineationDefault;
    } else if (trackRankingsDB?.collection?.type === 'track') {
      delineations = trackRankingsDB.gene2regionDelineations || [];
      delineationDefault = trackRankingsDB.delineationDefault;
    }
    setRegSearchSpaceOptions(convertToKeyValueOptions(delineations));
    setRegSearchSpaceId(delineationDefault?.id || '');
  };
  /** Recovery parameters */
  const updateRecoveryStates = (rankingDB) => {
    if (rankingDB?.collection) {
      if (rankingDB.collection.type === 'motif') {
        setNES(rankingDB.nesThreshold);
      }
      setAUC(rankingDB.aucThreshold);
      setRank(rankingDB.rankThreshold);
    }
  };

  useEffect(() => {
    // Get the initial organism and its default values
    organismRef.current = organisms[organismIndex];
    updateSearchSpace();
    updateCollections();
    updateRegulatoryRegion();
    const curRankingDB = updateRankingsDBs();
    updateRegionBasedParams();
    updateRecoveryStates(curRankingDB);
  }, [organismIndex]);

  const setExampleGenes = () => {
    // Load example genes for the selected organism
    const genes = exampleGenes[organismRef.current.speciesNomenclature.nomenclatureCode];
    geneInputRef.current.value = genes.join(' ');
    onGenesChanged(genes);
  };

  const handleOrganismChange = (event) => {
    const idx = event.target.value;
    setOrganismIndex(idx);
    onOrganismChanged(organisms[idx]);
  };
  const handleGenesChange = (event) => {
    const txt = event.target.value;
    const genes = parseGeneList(txt);
    onGenesChanged(genes);
  };

  const handleSearchSpaceTypeChange = (event) => {
    setSearchSpaceTypeId(event.target.value);
  };
  const handleMotifCollectionChange = (event) => {
    setMotifCollectionId(event.target.value);
    motifCollectionIdRef.current = event.target.value;
    updateRegulatoryRegion();
    const curRankingDB = updateRankingsDBs();
    updateRegionBasedParams();
    updateRecoveryStates(curRankingDB);
  };
  const handleTrackCollectionChange = (event) => {
    setTrackCollectionId(event.target.value);
    trackCollectionIdRef.current = event.target.value;
    updateRegulatoryRegion();
    const curRankingDB = updateRankingsDBs();
    updateRegionBasedParams();
    updateRecoveryStates(curRankingDB);
  };
  const handleRegRegionChange = (event) => {
    setRegRegionId(event.target.value);
  };
  const handleMotifRankingsDbChange = (event) => {
    setMotifRankingsDbId(event.target.value);
  };
  const handleTrackRankingsDbChange = (event) => {
    setTrackRankingsDbId(event.target.value);
  };
  const handleOverlapFractionChange = (event) => {
    setOverlapFraction(event.target.value);
  };
  const handleRegSearchSpaceChange = (event) => {
    setRegSearchSpaceId(event.target.value);
  };
  const handleUpstreamRegionChange = (event) => {
    setUpstreamRegion(event.target.value);
  };
  const handleDownstreamRegionChange = (event) => {
    setDownstreamRegion(event.target.value);
  };
  const handleNESChange = (event) => {
    setNES(event.target.value);
  };
  const handleAUCChange = (event) => {
    setAUC(event.target.value);
  };
  const handleRankChange = (event) => {
    setRank(event.target.value);
  };
  const handleOrthologousIdChange = (event) => {
    setOrthologousId(event.target.value);
  };
  const handleFDRChange = (event) => {
    setFDR(event.target.value);
  };

  return (
    <Box>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        gap={2}
        sx={{ pt: 2, px: isMobile ? 1 : 3 }}
      >
        <FormControl variant="filled" size="small">
          <Select
            variant="outlined"
            displayEmpty
            value={organismIndex}
            onChange={handleOrganismChange}
            renderValue={(idx) => {
              const organism = organisms[idx];
              // Show assembly only if there are multiple organisms with the same nomenclature
              const showAssembly = organisms.filter(o => o.speciesNomenclature.nomenclatureCode === organism.speciesNomenclature.nomenclatureCode).length > 1;
              return (
                <Box display="flex" gap={1}>
                  {idx !== '' ?
                    <>
                      { organismIcons[organism.speciesNomenclature.id]({color: 'inherit', fontSize: 'medium'}) }
                      { organism.speciesNomenclature.name} {showAssembly && `(${organism.speciesNomenclature.assembly})`}
                    </>
                    :
                    <Typography variant="body2">-- Select an organism --</Typography>
                  }
                </Box>
              );
            }}
          >
            {organisms.map(({ speciesNomenclature }, idx) => {
              // Show assembly only if there are multiple organisms with the same nomenclature
              const showAssembly = organisms.filter(o => o.speciesNomenclature.nomenclatureCode === speciesNomenclature.nomenclatureCode).length > 1;
              return (
                <MenuItem key={speciesNomenclature.id} value={idx}>
                  <ListItemIcon sx={{ pr: 2, color: (theme) => theme.palette.text.primary }}>
                    { organismIcons[speciesNomenclature.id]({ color: 'inherit', fontSize: 'large' }) }
                  </ListItemIcon>
                  <ListItemText
                    primary={`${speciesNomenclature.name} ${showAssembly ? `(${speciesNomenclature.assembly})` : ''}`}
                    secondary={speciesNomenclature.nomenclature}
                  />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        <FormControl sx={{ width: '100%' }}>
          <TextField
            inputRef={geneInputRef}
            aria-label="gene-list"
            placeholder="Enter gene list"
            multiline
            fullWidth
            minRows={isMobile ? 8 : 10}
            maxRows={isMobile ? 8 : 10}
            inputProps={{ spellCheck: false }}
            sx={{ minWidth: { sm: 400 } }}
            onChange={handleGenesChange}
          />
          <FormHelperText>
            <Tooltip title="Try it with some example genes (prostate cancer)">
              <Link underline="hover" onClick={setExampleGenes}>
                <Box component="span" >
                  <AutoAwesomeIcon color="inherit" sx={{ float: 'left', mr: 1, fontSize: '1.25rem' }} />
                  <Box component="span" sx={{ fontSize: '0.85rem' }}>
                    Example
                  </Box>
                </Box>
              </Link>
            </Tooltip>
          </FormHelperText>
        </FormControl>
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        gap={2}
        sx={{
          mt: 2, 
          px: isMobile ? 1 : 3,
          backgroundColor: (theme) => theme.palette.background.default
        }}
      >
        <FormControlLabel
          label="Show Advanced Options"
          control={
            <Checkbox
              checked={showAdvancedOptions}
              onChange={(event) => setShowAdvancedOptions(event.target.checked)}
              color="primary"
              size="small"
            />
          }
          sx={{
            '& .MuiFormControlLabel-label': { fontSize: (theme) => theme.typography.body2.fontSize },
          }}
        />
      {showAdvancedOptions && (
        <Box
          display="flex"
          flexDirection="column"
          gap={2}
          sx={{ mt: 1, pb: 1, width: '100%' }}
        >
          <TitledFormGroup title="Ranking">
            <FormSelect
              label="Search Space Type"
              helperText={searchSpaceTypeTooltip}
              options={searchSpaceTypeOptions}
              initialValue={searchSpaceTypeId}
              isMobile={isMobile}
              onChange={handleSearchSpaceTypeChange}
            />
            <FormSelect
              label="Motif Collection"
              helperText={collectionTooltip}
              options={motifCollectionOptions}
              initialValue={motifCollectionId}
              isMobile={isMobile}
              onChange={handleMotifCollectionChange}
            />
            <FormSelect
              label="Track Collection"
              helperText={collectionTooltip}
              options={trackCollectionOptions}
              initialValue={trackCollectionId}
              isMobile={isMobile}
              onChange={handleTrackCollectionChange}
            />
            <FormSelect
              label="Putative Regulatory Region"
              helperText={regRegionTooltip}
              options={regRegionOptions}
              initialValue={regRegionId}
              isMobile={isMobile}
              onChange={handleRegRegionChange}
            />
            <FormSelect
              label="Motif Rankings Database"
              helperText={rankingDatabaseTooltip}
              options={motifRankingsDbOptions}
              initialValue={motifRankingsDbId}
              isMobile={isMobile}
              onChange={handleMotifRankingsDbChange}
            />
            <FormSelect
              label="Track Rankings Database"
              helperText={rankingDatabaseTooltip}
              options={trackRankingsDbOptions}
              initialValue={trackRankingsDbId}
              isMobile={isMobile}
              onChange={handleTrackRankingsDbChange}
            />
          </TitledFormGroup>
        {searchSpaceTypeId === 'regions' && (
          <TitledFormGroup title="Region-Based">
            <FormTextField
              label="Overlap Fraction"
              helperText={overlapFractionTooltip}
              initialValue={overlapFraction}
              isMobile={isMobile}
              validationFn={(v) => isNumeric(v) && v >= 0 && v <= 1}
              errorMessage={<>Must be between <code>0.0</code> and <code>1.0</code></>}
              onChange={handleOverlapFractionChange}
            />
            <FormSelect
              label="Regulatory Search Space"
              helperText={regSearchSpaceTooltip}
              options={regSearchSpaceOptions}
              initialValue={regSearchSpaceId}
              isMobile={isMobile}
              onChange={handleRegSearchSpaceChange}
            />
          {regSearchSpaceId === '_specify' && (
            <>
              <FormTextField
                label="Upstream Region"
                helperText={upstreamRegionTooltip}
                initialValue={upstreamRegion}
                isMobile={isMobile}
                validationFn={(v) => v >= 1}
                errorMessage={<>Must be greater than or equal to <code>1</code></>}
                onChange={handleUpstreamRegionChange}
              />
              <FormTextField
                label="Downstream Region"
                helperText={downstreamRegionTooltip}
                initialValue={downstreamRegion}
                isMobile={isMobile}
                validationFn={(v) => v >= 1}
                errorMessage={<>Must be greater than or equal to <code>1</code></>}
                onChange={handleDownstreamRegionChange}
              />
            </>
          )}
          </TitledFormGroup>
        )}
          <TitledFormGroup title="Recovery Prediction">
            <FormTextField
              label="Enrichment Score Threshold"
              helperText={nesTooltip}
              initialValue={nes}
              isMobile={isMobile}
              validationFn={(v) => v >= 1.5}
              errorMessage={<>Must be greater than or equal to <code>1.5</code></>}
              onChange={handleNESChange}
            />
            <FormTextField
              label="ROC Threshold for AUC Calculation"
              helperText={aucTooltip}
              initialValue={auc}
              isMobile={isMobile}
              validationFn={(v) => isNumeric(v) && v >= 0 && v <= 1}
              errorMessage={<>Must be between <code>0.0</code> and <code>1.0</code></>}
              onChange={handleAUCChange}
            />
            <FormTextField
              label="Rank Threshold"
              helperText={rankTooltip}
              initialValue={rank}
              isMobile={isMobile}
              validationFn={(v) => v >= 1}
              errorMessage={<>Must be greater than or equal to <code>1</code></>}
              onChange={handleRankChange}
            />
          </TitledFormGroup>
          <TitledFormGroup title="TF Prediction">
            <FormTextField
              label="Min. Identity Between Orthologous Genes"
              helperText={orthologousIdTooltip}
              initialValue={orthologousId}
              disabled={!motifCollectionId || motifCollectionId === '' || motifCollectionId === 'none'}
              isMobile={isMobile}
              validationFn={(v) => isNumeric(v) && v >= 0 && v <= 1}
              errorMessage={<>Must be between <code>0.0</code> and <code>1.0</code></>}
              onChange={handleOrthologousIdChange}
            />
            <FormTextField
              label="Max. FDR on Motif Similarity"
              helperText={fdrTooltip}
              initialValue={fdr}
              disabled={!motifCollectionId || motifCollectionId === '' || motifCollectionId === 'none'}
              isMobile={isMobile}
              validationFn={(v) => isNumeric(v) && v >= 0 && v <= 1}
              errorMessage={<>Must be between <code>0.0</code> and <code>1.0</code></>}
              onChange={handleFDRChange}
            />
          </TitledFormGroup>
        </Box>
      )}
      </Box>
    </Box>
  );
}
QueryForm.propTypes = {
  dataConfig: PropTypes.instanceOf(DataConfig).isRequired,
  initialOrganism: PropTypes.object.isRequired,
  isMobile: PropTypes.bool,
  onOrganismChanged: PropTypes.func,
  onGenesChanged: PropTypes.func,
};