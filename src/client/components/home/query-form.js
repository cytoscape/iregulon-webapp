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
} from '../../data-config';
import { speciesNomenclatureDef } from '../../../util';
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
  NativeSelect,
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

const LABEL_MAX_WIDTH = 300;
const TXT_FIELD_MAX_WIDTH = 100;

const formControlLabelSx = (theme, isMobile) => ({
  width: '100%',
  mx: 0,
  my: isMobile ? 0.5 : 0.25,
  gap: isMobile ? 0 : 1,
  alignItems: isMobile? 'flex-start' : 'center',
  '& .MuiFormControlLabel-label': {
    fontSize: theme.typography.body2.fontSize,
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

function FormTextField({
  name,
  label,
  initialValue,
  helperText,
  disabled=false,
  isMobile,
  isTablet,
  validationFn,
  errorMessage,
  infoMessage,
  onChange,
  onError,
}) {
  const [ value, setValue ] = useState(initialValue);
  const [ error, setError ] = useState(false);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (event) => {
    const newValue = event.target.value;
    setValue(newValue);
    let hasError = false;
    if (validationFn) {
      hasError = !validationFn(newValue);
      setError(hasError);
    }
    onError?.(name, hasError); // Notify parent about the error
    onChange(event);
  };

  return (
    <FormControlLabel
      label={label + ':'}
      disabled={disabled}
      control={
        <Box sx={{
          width: isMobile ? '100%' : `calc(100% - ${LABEL_MAX_WIDTH}px)`,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1,
        }}>
          <TextField
            name={name}
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
              flexGrow: 1,
            })}
          />
        {infoMessage && !error && (
          <Typography
            variant="caption"
            sx={{
              flexGrow: 1,
              color: (theme) => theme.palette.text.disabled,
            }}
          >
            { infoMessage }
          </Typography>
        )}
        {error && (errorMessage || infoMessage) && (
          <Typography
            variant="caption"
            color="error"
            sx={{ flexGrow: 1 }}
          >
            { (isMobile || isTablet) && infoMessage ? infoMessage : errorMessage }
          </Typography>
        )}
        {!isMobile && (
          <FieldHelpIcon
            title={helperText}
          />
        )}
        </Box>
      }
      labelPlacement={isMobile ? 'top' : 'start'}
      sx={(theme) => formControlLabelSx(theme, isMobile)}
    />
  );
}
FormTextField.propTypes = {
  name: PropTypes.string,
  label: PropTypes.string.isRequired,
  initialValue: PropTypes.any,
  helperText: PropTypes.any,
  disabled: PropTypes.bool,
  isMobile: PropTypes.bool,
  isTablet: PropTypes.bool,
  validationFn: PropTypes.func,
  errorMessage: PropTypes.any,
  infoMessage: PropTypes.any,
  onChange: PropTypes.func,
  onError: PropTypes.func,
};

//==[ FormSelect ]====================================================================================================

function FormSelect({ name, label, options, initialValue, helperText, disabled=false, isMobile, onChange }) {
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
          <>
            <FieldHelpIcon title={helperText} />
            <Select
              name={name}
              value={value}
              onChange={handleChange}
              disabled={disabled || entries.length < 2}
              displayEmpty
              fullWidth
              size="small"
              sx={theme => ({
                backgroundColor: theme.palette.background.paper,
                fontSize: theme.typography.body2.fontSize,
                fontStyle: value === '_specify' ? 'italic' : 'normal',
                maxWidth: { sm: `calc(100% - ${LABEL_MAX_WIDTH}px - 24px - 4px)`, xs: 'calc(100% - 8px)' },
              })}
              renderValue={(value) => {
                return (
                  <Typography
                    component="span"
                    variant="inherit"
                    sx={{
                      fontSize: 'inherit',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                  {value && value !== '' ?
                    (options[value] || value) : `-- No ${label.toLowerCase()} --`
                  }
                  </Typography>
                );
              }}
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
        )}
        {isMobile && (
          <NativeSelect
            name={name}
            value={value}
            onChange={handleChange}
            disabled={disabled || entries.length < 2}
            variant="outlined"
            fullWidth
            disableUnderline
            sx={theme => ({
              backgroundColor: theme.palette.background.paper,
              p: 0,
              width: 'calc(100% - 2px)',
              '& .MuiInputBase-input': {
                backgroundColor: theme.palette.background.paper,
                border: '1px solid',
                borderColor: theme.palette.divider,
                borderRadius: 1,
                fontSize: theme.typography.body2.fontSize,
                fontStyle: value === '_specify' ? 'italic' : 'normal',
                px: 1.5,
                py: 1,
                transition: theme.transitions.create(['border-color', 'box-shadow']),
                '&:hover': {
                  borderColor: 'unset',
                },
                '&:focus': {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                },
              },
            })}
          >
          {entries.map(([k, v]) => (
            <option key={k} value={k}>{ v }</option>
          ))}
          </NativeSelect>
        )}
        </>
      }
      labelPlacement={isMobile ? 'top' : 'start'}
      sx={(theme) => formControlLabelSx(theme, isMobile)}
    />
  );
}
FormSelect.propTypes = {
  name: PropTypes.string,
  label: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
  initialValue: PropTypes.string,
  helperText: PropTypes.any,
  disabled: PropTypes.bool,
  isMobile: PropTypes.bool,
  onChange: PropTypes.func,
};

//==[ TitledFormGroup ]===============================================================================================

function TitledFormGroup({ title, isMobile, children }) {
  return (
    <Box
      component="fieldset"
      sx={{
        width: '100%',
        // add these styles only if isMobile: { padding: 0, border: 'none' }
        ...(isMobile ? { 
            px: 0,
            pt: 2,
            border: 'none',
            borderTop: theme => `1px solid ${theme.palette.divider}`,
          } : {
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
          }),
      }}
    >
      <Typography
        component="legend"
        fontSize="small"
        sx={{ textAlign: isMobile ? 'center': 'left' }}
      >
        { title }
      </Typography>
      { children }
    </Box>
  );
}
TitledFormGroup.propTypes = {
  title: PropTypes.string.isRequired,
  isMobile: PropTypes.bool,
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
  -- The value must be between 0.0 and 1.0 --
</>;

const regSearchSpaceTooltip = <>
  Select a predefined regulatory search space or specify the size of the region upstream/downstream of the TSS to use in the mapping to predefined regions.
</>;

const upstreamRegionTooltip = <>
  The size of the region &#40;in bp&#41; upstream of the TSS to use in the mapping to predefined regions.<br />
  -- The value must be greater than or equal to 1 --
</>;

const downstreamRegionTooltip = <>
  The size of the region &#40;in bp&#41; downstream of the TSS to use in the mapping to predefined regions.<br />
  -- The value must be greater than or equal to 1 --
</>;

const nesTooltip = <>
  The minimal NES score to consider a motif as being relevant.<br />
  -- The value must be greater than or equal to 1.5 --
</>;

const aucTooltip = <>
  The Area Under the Curve &#40;AUC&#41; values are calculated for all motifs at the beginning of the cumulative gene recovery plot &#40;aka ROC curve&#41;
  which plots the input gene recovery along the whole genome ranking.<br />
  This threshold indicates the percentage of the top ranked genes/regions to consider for the AUC calculation.<br />
  -- The value must be between 0.0 and 1.0 --
</>;

const rankTooltip = <>
  The x-axis cutoff for visualization of the ROC curve.<br />
  This value corresponds with the top genes shown on the results.<br />
  -- The value must be greater than or equal to 1 --
</>;

const orthologousIdTooltip = <>
  A threshold on the miniminal identity score to define gene orthology.<br />
  This %identity was calculated in <TooltipLink href="https://pubmed.ncbi.nlm.nih.gov/19029536/">EnsemblCompara gene trees</TooltipLink> based on
  whole amino acid sequence alignments &#40;tf2tf associations&#41;.<br />
  The closer the score to zero, the more homologous genes can be associated to an annotated TF. But when the threshold is set to one,
  no orthologous information is used.<br />
  -- The value must be between 0.0 and 1.0 --
</>;

const fdrTooltip = <>
  A threshold on the maximal FDR calculated by the TOMTOM p-value for the similarity of the motifs &#40;motif2motif associations&#41;.<br />
  The closer the score to zero, the more similar motifs will be selected for association to a enriched motif. But when the threshold is set to zero,
  no motif similarity information is used.<br />
  -- The value must be between 0.0 and 1.0 --
</>; 

const zeroToOneValidationProps = {
  validationFn: (v) => isNumeric(v) && v >= 0 && v <= 1,
  errorMessage: <>Must be between <code>0.0</code> and <code>1.0</code></>,
  infoMessage: <code>&#40;0.0-1.0&#41;</code>,
};
const greaterThanOrEqualValidationProps = (min) => ({
  validationFn: (v) => isNumeric(v) && v >= min,
  errorMessage: <>Must be greater than or equal to <code>{min}</code></>,
  infoMessage: <code>&#40;&ge; {min}&#41;</code>,
});

export function QueryForm({
  dataConfig,
  initialAssemblyCode,
  isMobile,
  isTablet,
  onAssemblyCodeChange,
  onGenesChange,
  onAdvancedOptionsChange,
}) {
  const [ assemblyCode, setAssemblyCode ] = useState(initialAssemblyCode);
  const [ showAdvancedOptions, setShowAdvancedOptions ] = useState(false);
  const [ searchSpaceTypeOptions, setSearchSpaceTypeOptions ] = useState([]);
  const [ motifCollectionOptions, setMotifCollectionOptions ] = useState({});
  const [ trackCollectionOptions, setTrackCollectionOptions ] = useState({});
  const [ regRegionOptions, setRegRegionOptions ] = useState({});
  const [ motifRankingsDbOptions, setMotifRankingsDbOptions ] = useState({});
  const [ trackRankingsDbOptions, setTrackRankingsDbOptions ] = useState({});
  const [ regSearchSpaceOptions, setRegSearchSpaceOptions ] = useState({});
  const [ advancedOptionsState, setAdvancedOptionsState ] = useState({
    searchSpaceTypeId: '',
    motifCollectionId: '',
    trackCollectionId: '',
    regRegionId: '',
    motifRankingsDbId: '',
    trackRankingsDbId: '',
    overlapFraction: DEFAULT_OVERLAP,
    regSearchSpaceId: '',
    upstreamRegion: DEFAULT_UPSTREAM,
    downstreamRegion: DEFAULT_DOWNSTREAM,
    nes: DEFAULT_NES_THRESHOLD.toFixed(1),
    auc: DEFAULT_AUC_THRESHOLD,
    rank: DEFAULT_RANK_THRESHOLD,
    orthologousId: DEFAULT_MIN_ORTHOLOGOUS_IDENTITY.toFixed(1),
    fdr: DEFAULT_MAX_MOTIF_SIMILARITY_FDR,
  });
  const [ errors, setErrors ] = useState({}); // Track errors for each field

  const speciesNomenclatureRef = useRef(speciesNomenclatureDef[assemblyCode]);
  const errorsRef = useRef(errors);
  const geneInputRef = useRef();

  /** Type of Search Space */
  const updateSearchSpaceTypes = () => {
    // Retrieve all search space types for the selected organism
    const searchSpaceTypes = dataConfig.getSearchSpaceTypes(speciesNomenclatureRef.current.assembly);
    // Then set the previously selected search space type or the first one if the new list does not contain that type
    const curSearchSpaceTypeId = advancedOptionsState.searchSpaceTypeId;
    let searchSpaceTypeId;
    if (searchSpaceTypes.length === 1) {
      searchSpaceTypeId = searchSpaceTypes[0].id;
    } else if (searchSpaceTypes.length > 1) {
      searchSpaceTypeId = searchSpaceTypes.find(t => t.id === curSearchSpaceTypeId)?.id || searchSpaceTypes[0].id;
    }
    setSearchSpaceTypeOptions(convertToKeyValueOptions(searchSpaceTypes));
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      searchSpaceTypeId,
    }));
    return searchSpaceTypeId;
  };
  /** Motif Collections */
  const updateMotifCollections = (searchSpaceTypeId) => {
    // Fetch the `Motif Collections` for the current `Search Space Type` then set and return the default one
    const motifCollections = dataConfig.getCollections(speciesNomenclatureRef.current.assembly, searchSpaceTypeId, 'motif');
    const motifCollectionId = getDefaultCollectionValue(motifCollections);
    setMotifCollectionOptions(convertToKeyValueOptions(motifCollections));
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      motifCollectionId,
    }));
    return motifCollectionId;
  };
  /** Track Collections */
  const updateTrackCollections = (searchSpaceTypeId) => {
    // Fetch the `Track Collections` for the current `Search Space Type` then set and return the default one
    const trackCollections = dataConfig.getCollections(speciesNomenclatureRef.current.assembly, searchSpaceTypeId, 'track');
    const trackCollectionId = getDefaultCollectionValue(trackCollections);
    setTrackCollectionOptions(convertToKeyValueOptions(trackCollections));
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      trackCollectionId,
    }));
    return trackCollectionId;
  };
  /** Putative Regulatory Region */
  const updateRegulatoryRegion = (searchSpaceTypeId, motifCollectionId, trackCollectionId) => {
    const regRegions = dataConfig.getPutativeRegulatoryRegions(searchSpaceTypeId, motifCollectionId, trackCollectionId);
    const regRegionId = regRegions.length > 0 ? regRegions[0].id : '';
    setRegRegionOptions(convertToKeyValueOptions(regRegions));
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      regRegionId,
    }));
    return regRegionId;
  };
  /** Motif/Track Rankings Databases */
  const updateMotifRankingsDB = (searchSpaceTypeId, motifCollectionId, regRegionId) => {
    const motifRankingsDBs = dataConfig.getRankingsDatabases(
      speciesNomenclatureRef.current.assembly,
      searchSpaceTypeId,
      'motif',
      motifCollectionId,
      regRegionId
    );
    const defMotifRankingsDB = motifRankingsDBs[0];
    setMotifRankingsDbOptions(convertToKeyValueOptions(motifRankingsDBs));
    const motifRankingsDbId = defMotifRankingsDB?.id || '';
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      motifRankingsDbId,
    }));
    return motifRankingsDbId;
  };
  const updateTrackRankingsDB = (searchSpaceTypeId, trackCollectionId, regRegionId) => {
    const trackRankingsDBs = dataConfig.getRankingsDatabases(
      speciesNomenclatureRef.current.assembly,
      searchSpaceTypeId,
      'track',
      trackCollectionId,
      regRegionId
    );
    const defTrackRankingsDB = trackRankingsDBs[0];
    setTrackRankingsDbOptions(convertToKeyValueOptions(trackRankingsDBs));
    const trackRankingsDbId = defTrackRankingsDB?.id || '';
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      trackRankingsDbId,
    }));
    return trackRankingsDbId;
  };
  /** Region-based specific parameters */
  const updateRegionBasedParams = (motifRankingsDbId, trackRankingsDbId) => {
    // Get motif and track rankings databases by id
    const allRankingsDBs = dataConfig.getAllRankingsDatabases();
    const motifRankingsDB = allRankingsDBs.find(db => db.id === motifRankingsDbId);
    const trackRankingsDB = allRankingsDBs.find(db => db.id === trackRankingsDbId);
    // Get the corresponding delineations and the default one
    let delineations = [], delineationDefault;
    if (motifRankingsDB?.collection && motifRankingsDB.collection.id !== 'none') {
      delineations = motifRankingsDB.gene2regionDelineations;
      delineationDefault = motifRankingsDB.delineationDefault;
    } else if (trackRankingsDB?.collection && trackRankingsDB.collection.id !== 'none') {
      delineations = trackRankingsDB.gene2regionDelineations;
      delineationDefault = trackRankingsDB.delineationDefault;
    }
    const regSearchSpaceId = delineationDefault?.id || '';
    setRegSearchSpaceOptions(convertToKeyValueOptions(delineations));
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      regSearchSpaceId,
    }));
    return regSearchSpaceId;
  };
  /** Recovery parameters (thresholds) */
  const updateRecoveryStates = (motifRankingsDbId, trackRankingsDbId) => {
    let states = {};
    // Find which rankings database to use
    let rankingsDB;
    if (motifRankingsDbId && motifRankingsDbId !== 'none') {
      rankingsDB = dataConfig.getAllRankingsDatabases().find(db => db.id === motifRankingsDbId);
    } else if (trackRankingsDbId && trackRankingsDbId !== 'none') {
      rankingsDB = dataConfig.getAllRankingsDatabases().find(db => db.id === trackRankingsDbId);
    }
    // Get the thresholds from the rankings database
    if (rankingsDB?.collection) {
      states = {
        ...(rankingsDB.collection.type === 'motif' && { nes: rankingsDB.nesThreshold?.toFixed(1) || DEFAULT_NES_THRESHOLD.toFixed(1) }),
        auc: rankingsDB.aucThreshold,
        rank: rankingsDB.rankThreshold,
      };
      setAdvancedOptionsState((prevFormData) => ({
        ...prevFormData,
        ...states,
      }));
    }
    return states;
  };

  const reset = () => {
    // First, update the `Search Space Types` ('genes', 'regions') associated with the selected species
    const searchSpaceTypeId = updateSearchSpaceTypes();
    // Next, fetch the `Motif/Track Collections` for the current `Search Space Type`
    const motifCollectionId = updateMotifCollections(searchSpaceTypeId);
    const trackCollectionId = updateTrackCollections(searchSpaceTypeId);
    // Then update the `Putative Regulatory Region` based on the selected motif and track `Collections`
    const regRegionId = updateRegulatoryRegion(searchSpaceTypeId, motifCollectionId, trackCollectionId);
    // Now update the motif and track `Rankings Databases` based on the selected motif and track `Collections`, respectively
    const motifRankingsDbId = updateMotifRankingsDB(searchSpaceTypeId, motifCollectionId, regRegionId);
    const trackRankingsDbId = updateTrackRankingsDB(searchSpaceTypeId, trackCollectionId, regRegionId);
    // Finally, update the region-based parameters and the recovery states
    updateRegionBasedParams(motifRankingsDbId, trackRankingsDbId);
    updateRecoveryStates(motifRankingsDbId, trackRankingsDbId);
    // Reset errors
    setErrors({});
    errorsRef.current = {};
    // Reset the other options to their default values
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      overlapFraction: DEFAULT_OVERLAP,
      upstreamRegion: DEFAULT_UPSTREAM,
      downstreamRegion: DEFAULT_DOWNSTREAM,
      orthologousId: DEFAULT_MIN_ORTHOLOGOUS_IDENTITY.toFixed(1),
      fdr: DEFAULT_MAX_MOTIF_SIMILARITY_FDR,
    }));
  };

  useEffect(() => {
    // Get the initial organism and its default values
    speciesNomenclatureRef.current = speciesNomenclatureDef[assemblyCode];
    reset();
  }, [assemblyCode]);

  useEffect(() => {
    onAdvancedOptionsChange?.({
      ...advancedOptionsState,
      errors: errorsRef.current
    });
  }, [advancedOptionsState]);

  const setExampleGenes = () => {
    // Load example genes for the selected organism
    const genes = exampleGenes[speciesNomenclatureRef.current.nomenclatureCode];
    geneInputRef.current.value = genes.join(' ');
    onGenesChange(genes);
  };

  const handleOrganismChange = (event) => {
    const newAssembly = event.target.value;
    setAssemblyCode(newAssembly);
    onAssemblyCodeChange(newAssembly);
  };
  const handleGenesChange = (event) => {
    const txt = event.target.value;
    const genes = parseGeneList(txt);
    onGenesChange(genes);
  };
  const handleAdvancedOptionsChange = (event) => {
    const { name, value } = event.target;
    if (name === 'searchSpaceTypeId') {
      const motifCollectionId = updateMotifCollections(value);
      const trackCollectionId = updateTrackCollections(value);
      const regRegionId = updateRegulatoryRegion(value, motifCollectionId, trackCollectionId);
      const motifRankingsDbId = updateMotifRankingsDB(value, motifCollectionId, regRegionId);
      const trackRankingsDbId = updateTrackRankingsDB(value, trackCollectionId, regRegionId);
      updateRegionBasedParams(motifRankingsDbId, trackRankingsDbId);
      updateRecoveryStates(motifRankingsDbId, trackRankingsDbId);
    } else if (name === 'motifCollectionId') {
      const regRegionId = updateRegulatoryRegion(advancedOptionsState.searchSpaceTypeId, value, advancedOptionsState.trackCollectionId);
      const motifRankingsDbId = updateMotifRankingsDB(advancedOptionsState.searchSpaceTypeId, value, regRegionId);
      updateRegionBasedParams(motifRankingsDbId, advancedOptionsState.trackRankingsDbId);
      updateRecoveryStates(motifRankingsDbId, null);
    } else if (name === 'trackCollectionId') {
      const regRegionId = updateRegulatoryRegion(advancedOptionsState.searchSpaceTypeId, advancedOptionsState.motifCollectionId, value);
      const trackRankingsDbId = updateTrackRankingsDB(advancedOptionsState.searchSpaceTypeId, value, regRegionId);
      updateRegionBasedParams(advancedOptionsState.motifRankingsDbId, trackRankingsDbId);
      updateRecoveryStates(null, trackRankingsDbId);
    } else if (name === 'regRegionId') {
      const motifRankingsDbId = updateMotifRankingsDB(advancedOptionsState.searchSpaceTypeId, advancedOptionsState.motifCollectionId, value);
      const trackRankingsDbId = updateTrackRankingsDB(advancedOptionsState.searchSpaceTypeId, advancedOptionsState.trackCollectionId, value);
      updateRegionBasedParams(motifRankingsDbId, trackRankingsDbId);
      updateRecoveryStates(motifRankingsDbId, trackRankingsDbId);
    } else if (name === 'motifRankingsDbId' || name === 'trackRankingsDbId') {
      if (name === 'motifRankingsDbId') {
        updateRegionBasedParams(value, advancedOptionsState.trackRankingsDbId);
        updateRecoveryStates(value, null);
      } else {
        updateRegionBasedParams(advancedOptionsState.motifRankingsDbId, value);
        updateRecoveryStates(null, value);
      }
    }
    setAdvancedOptionsState((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleShowAdvancedOptionsChange = (event) => {
    const show = event.target.checked;
    setShowAdvancedOptions(show);
    if (!show) {
      reset();
    }
  };

  const handleError = (fieldName, hasError) => {
    setErrors((prevErrors) => {
      const updatedErrors = { ...prevErrors, [fieldName]: hasError };
      if (!hasError) {
        delete updatedErrors[fieldName]; // Remove the field if no error
      }
      errorsRef.current = updatedErrors;
      return updatedErrors;
    });
  };

  /** Show assembly only if there are multiple organisms with the same nomenclature */
  const showAssembly = (nomenclatureCode) => Object.values(speciesNomenclatureDef).filter(el => el.nomenclatureCode === nomenclatureCode).length > 1;
  
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
            value={assemblyCode}
            onChange={handleOrganismChange}
            renderValue={(value) => {
              const species = speciesNomenclatureDef[value];
              return (
                <Box display="flex" gap={1}>
                  {value !== '' ?
                    <>
                      { organismIcons[species.id]({ color: 'inherit', fontSize: 'medium' }) }
                      { species.name} {showAssembly(species.nomenclatureCode) && `(${species.assembly})`}
                    </>
                    :
                    <Typography variant="body2">-- Select an organism --</Typography>
                  }
                </Box>
              );
            }}
          >
            {Object.values(speciesNomenclatureDef).map(({ id, name, assembly, nomenclatureCode, nomenclature }) => {
              return (
                <MenuItem key={assembly} value={assembly}>
                  <ListItemIcon sx={{ pr: 2, color: (theme) => theme.palette.text.primary }}>
                    { organismIcons[id]({ color: 'inherit', fontSize: 'large' }) }
                  </ListItemIcon>
                  <ListItemText
                    primary={`${name} ${showAssembly(nomenclatureCode) ? `(${assembly})` : ''}`}
                    secondary={nomenclature}
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
            onError={handleError}
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
              onChange={handleShowAdvancedOptionsChange}
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
          <TitledFormGroup title="Ranking" isMobile={isMobile}>
            <FormSelect
              name="searchSpaceTypeId"
              label="Search Space Type"
              helperText={searchSpaceTypeTooltip}
              options={searchSpaceTypeOptions}
              initialValue={advancedOptionsState.searchSpaceTypeId}
              isMobile={isMobile}
              onChange={handleAdvancedOptionsChange}
            />
            <FormSelect
              name="motifCollectionId"
              label="Motif Collection"
              helperText={collectionTooltip}
              options={motifCollectionOptions}
              initialValue={advancedOptionsState.motifCollectionId}
              isMobile={isMobile}
              onChange={handleAdvancedOptionsChange}
            />
            <FormSelect
              name="trackCollectionId"
              label="Track Collection"
              helperText={collectionTooltip}
              options={trackCollectionOptions}
              initialValue={advancedOptionsState.trackCollectionId}
              isMobile={isMobile}
              onChange={handleAdvancedOptionsChange}
            />
            <FormSelect
              name="regRegionId"
              label="Putative Regulatory Region"
              helperText={regRegionTooltip}
              options={regRegionOptions}
              initialValue={advancedOptionsState.regRegionId}
              isMobile={isMobile}
              onChange={handleAdvancedOptionsChange}
            />
            <FormSelect
              name="motifRankingsDbId"
              label="Motif Rankings Database"
              helperText={rankingDatabaseTooltip}
              options={motifRankingsDbOptions}
              initialValue={advancedOptionsState.motifRankingsDbId}
              isMobile={isMobile}
              onChange={handleAdvancedOptionsChange}
            />
            <FormSelect
              name="trackRankingsDbId"
              label="Track Rankings Database"
              helperText={rankingDatabaseTooltip}
              options={trackRankingsDbOptions}
              initialValue={advancedOptionsState.trackRankingsDbId}
              isMobile={isMobile}
              onChange={handleAdvancedOptionsChange}
            />
          </TitledFormGroup>
        {advancedOptionsState.searchSpaceTypeId === 'regions' && (
          <TitledFormGroup title="Region-Based" isMobile={isMobile}>
            <FormTextField
              name="overlapFraction"
              label="Overlap Fraction"
              helperText={overlapFractionTooltip}
              initialValue={advancedOptionsState.overlapFraction}
              isMobile={isMobile}
              isTablet={isTablet}
              onChange={handleAdvancedOptionsChange}
              onError={handleError}
              {...zeroToOneValidationProps}
            />
            <FormSelect
              name="regSearchSpaceId"
              label="Regulatory Search Space"
              helperText={regSearchSpaceTooltip}
              options={regSearchSpaceOptions}
              initialValue={advancedOptionsState.regSearchSpaceId}
              isMobile={isMobile}
              onChange={handleAdvancedOptionsChange}
            />
          {advancedOptionsState.regSearchSpaceId === '_specify' && (
            <>
              <FormTextField
                name="upstreamRegion"
                label="Upstream Region"
                helperText={upstreamRegionTooltip}
                initialValue={advancedOptionsState.upstreamRegion}
                isMobile={isMobile}
                isTablet={isTablet}
                onChange={handleAdvancedOptionsChange}
                onError={handleError}
                {...greaterThanOrEqualValidationProps(1)}
              />
              <FormTextField
                name="downstreamRegion"
                label="Downstream Region"
                helperText={downstreamRegionTooltip}
                initialValue={advancedOptionsState.downstreamRegion}
                isMobile={isMobile}
                isTablet={isTablet}
                onChange={handleAdvancedOptionsChange}
                onError={handleError}
                {...greaterThanOrEqualValidationProps(1)}
              />
            </>
          )}
          </TitledFormGroup>
        )}
          <TitledFormGroup title="Recovery Prediction" isMobile={isMobile}>
            <FormTextField
              name="nes"
              label="Enrichment Score Threshold"
              helperText={nesTooltip}
              initialValue={advancedOptionsState.nes}
              isMobile={isMobile}
              isTablet={isTablet}
              onChange={handleAdvancedOptionsChange}
              onError={handleError}
              {...greaterThanOrEqualValidationProps(1.5)}
            />
            <FormTextField
              name="auc"
              label="ROC Threshold for AUC Calculation"
              helperText={aucTooltip}
              initialValue={advancedOptionsState.auc}
              isMobile={isMobile}
              isTablet={isTablet}
              onChange={handleAdvancedOptionsChange}
              onError={handleError}
              {...zeroToOneValidationProps}
            />
            <FormTextField
              name="rank"
              label="Rank Threshold"
              helperText={rankTooltip}
              initialValue={advancedOptionsState.rank}
              isMobile={isMobile}
              isTablet={isTablet}
              onChange={handleAdvancedOptionsChange}
              onError={handleError}
              {...greaterThanOrEqualValidationProps(1)}
            />
          </TitledFormGroup>
          <TitledFormGroup title="TF Prediction" isMobile={isMobile}>
            <FormTextField
              name="orthologousId"
              label="Min. Identity Between Orthologous Genes"
              helperText={orthologousIdTooltip}
              initialValue={advancedOptionsState.orthologousId}
              disabled={!advancedOptionsState.motifCollectionId || advancedOptionsState.motifCollectionId === '' || advancedOptionsState.motifCollectionId === 'none'}
              isMobile={isMobile}
              isTablet={isTablet}
              onChange={handleAdvancedOptionsChange}
              onError={handleError}
              {...zeroToOneValidationProps}
            />
            <FormTextField
              name="fdr"
              label="Max. FDR on Motif Similarity"
              helperText={fdrTooltip}
              initialValue={advancedOptionsState.fdr}
              disabled={!advancedOptionsState.motifCollectionId || advancedOptionsState.motifCollectionId === '' || advancedOptionsState.motifCollectionId === 'none'}
              isMobile={isMobile}
              isTablet={isTablet}
              onChange={handleAdvancedOptionsChange}
              onError={handleError}
              {...zeroToOneValidationProps}
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
  initialAssemblyCode: PropTypes.string.isRequired,
  isMobile: PropTypes.bool,
  isTablet: PropTypes.bool,
  onAssemblyCodeChange: PropTypes.func,
  onGenesChange: PropTypes.func,
  onAdvancedOptionsChange: PropTypes.func,
};