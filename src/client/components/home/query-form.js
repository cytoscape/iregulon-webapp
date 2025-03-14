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
import {
  Box,
  FormGroup,
  FormControl,
  FormHelperText,
  MenuItem,
  Link,
  ListItemIcon,
  ListItemText,
  Select,
  TextField,
  Tooltip,
  Typography, FormControlLabel, Checkbox,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { FlyIcon, HumanIcon, MouseIcon } from '../svg-icons';
import { use } from 'react';


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

const formControlLabelSx = (theme, isMobile) => ({
  width: '100%',
  ml: 0,
  gap: isMobile ? 0 : 1,
  alignItems: isMobile? 'flex-start' : 'center',
  '& .MuiFormControlLabel-label': {
    fontSize: theme.typography.body2.fontSize,
    minWidth: { sm: 300 },
    textAlign: isMobile ? 'left' : 'right',
  },
});

//==[ FormTextField ]=================================================================================================

function FormTextField({ label, initialValue, disabled=false, isMobile, onChange }) {
  const [ value, setValue ] = useState(initialValue);
  
  const handleChange = (event) => {
    setValue(event.target.value);
    onChange(event);
  };

  return (
    <FormControlLabel
      label={label + ':'}
      disabled={disabled}
      control={
        <TextField
          value={value}
          onChange={handleChange}
          fullWidth
          size="small"
          inputProps={{
            spellCheck: false,
            sx: theme => ({
              fontSize: theme.typography.body2.fontSize,
            })
          }}
          sx={theme => ({
            backgroundColor: theme.palette.background.paper,
            fontSize: theme.typography.body2.fontSize
          })}
        />
      }
      labelPlacement={isMobile ? 'top' : 'start'}
      sx={(theme) => formControlLabelSx(theme, isMobile)}
    />
  );
}
FormTextField.propTypes = {
  label: PropTypes.string.isRequired,
  initialValue: PropTypes.any,
  disabled: PropTypes.bool,
  isMobile: PropTypes.bool,
  onChange: PropTypes.func,
};

//==[ FormSelect ]====================================================================================================

function FormSelect({ label, options, initialValue, disabled=false, isMobile, onChange }) {
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
        <Select
          value={value}
          onChange={handleChange}
          fullWidth
          size="small"
          sx={theme => ({
            backgroundColor: theme.palette.background.paper,
            fontSize: theme.typography.body2.fontSize
          })}
        >
          {entries.map(([k, v]) => (
            <MenuItem
              key={k}
              value={k}
              sx={theme => ({
                fontSize: theme.typography.body2.fontSize
              })}
            >
                { v }
            </MenuItem>
          ))}
        </Select>
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
  disabled: PropTypes.bool,
  isMobile: PropTypes.bool,
  onChange: PropTypes.func,
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
  const [ regRegion, setRegRegion ] = useState('');
  const [ motifRankingsDbOptions, setMotifRankingsDbOptions ] = useState({});
  const [ motifRankingsDbId, setMotifRankingsDbId ] = useState('');
  const [ trackRankingsDbOptions, setTrackRankingsDbOptions ] = useState({});
  const [ trackRankingsDbId, setTrackRankingsDbId ] = useState('');
  const [ overlapFraction, setOverlapFraction ] = useState(DEFAULT_OVERLAP);
  const [ regSearchSpace, setRegSearchSpace ] = useState('');
  const [ upstreamRegion, setUpstreamRegion ] = useState(DEFAULT_UPSTREAM);
  const [ downstreamRegion, setDownstreamRegion ] = useState(DEFAULT_DOWNSTREAM);
  const [ nes, setNES ] = useState(DEFAULT_NES_THRESHOLD);
  const [ auc, setAUC ] = useState(DEFAULT_AUC_THRESHOLD);
  const [ rank, setRank ] = useState(DEFAULT_RANK_THRESHOLD);
  const [ orthologousId, setOrthologousId ] = useState(DEFAULT_MIN_ORTHOLOGOUS_IDENTITY);
  const [ fdr, setFDR ] = useState(DEFAULT_MAX_MOTIF_SIMILARITY_FDR);

  const geneInputRef = useRef();

  useEffect(() => {
    const rankingsDBs = dataConfig.getAllRankingsDatabases();
    console.log('1 >> RANKINGS DATABASES: ', rankingsDBs);
    // Get initial organism and its default values
    const org = organisms[organismIndex];
    const searchSpaceTypes = dataConfig.getSearchSpaceTypes(org);
    const defSearchSpaceTypeId = searchSpaceTypes[0].id;
    // Motif/Track Collections
    const motifCollections = dataConfig.getCollections(org, defSearchSpaceTypeId, 'motif');
    const defMotifCollectionId = getDefaultCollectionValue(motifCollections);
    const trackCollections = dataConfig.getCollections(org, defSearchSpaceTypeId, 'track');
    const defTrackCollectionId = getDefaultCollectionValue(trackCollections);
    setMotifCollectionOptions(convertToKeyValueOptions(motifCollections));
    setMotifCollectionId(defMotifCollectionId);
    setTrackCollectionOptions(convertToKeyValueOptions(trackCollections));
    setTrackCollectionId(defTrackCollectionId);
    // Gene Regulatory Regions
    const regRegions = dataConfig.getPutativeRegulatoryRegions(defMotifCollectionId, defTrackCollectionId, defSearchSpaceTypeId);
    const defRegRegionId = regRegions.length > 0 ? regRegions[0].id : '';
    setRegRegionOptions(convertToKeyValueOptions(regRegions));
    setRegRegion(defRegRegionId);
    // Rankings Databases
    const motifRankingsDBs = dataConfig.getRankingsDatabases(org, defSearchSpaceTypeId, 'motif', defMotifCollectionId, defRegRegionId);
    const trackRankingsDBs = dataConfig.getRankingsDatabases(org, defSearchSpaceTypeId, 'track', defTrackCollectionId, defRegRegionId);
    const defMotifRankingsDB = motifRankingsDBs[0]; // TODO check if this is correct
    const defTrackRankingsDB = trackRankingsDBs[0]; // TODO check if this is correct
    const defRankingDB = (defMotifRankingsDB?.id !== 'none') || defTrackRankingsDB; // TODO check if this is correct
    setMotifRankingsDbOptions(convertToKeyValueOptions(motifRankingsDBs));
    setMotifRankingsDbId(defMotifRankingsDB?.id || '');
    setTrackRankingsDbOptions(convertToKeyValueOptions(trackRankingsDBs));
    setTrackRankingsDbId(defTrackRankingsDB?.id || '');
    // Search Space Type
    setSearchSpaceTypeOptions(convertToKeyValueOptions(searchSpaceTypes));
    setSearchSpaceTypeId(defSearchSpaceTypeId);
    // Region-based specific parameters
    setOverlapFraction(DEFAULT_OVERLAP);
    setRegSearchSpace('');
    setUpstreamRegion(DEFAULT_UPSTREAM);
    setDownstreamRegion(DEFAULT_DOWNSTREAM);
    // Thresholds
    setNES(defRankingDB.nesThreshold);
    setAUC(defRankingDB.aucThreshold);
    setRank(defRankingDB.rankThreshold);
    setOrthologousId(DEFAULT_MIN_ORTHOLOGOUS_IDENTITY);
    setFDR(DEFAULT_MAX_MOTIF_SIMILARITY_FDR);
  }, [organismIndex]);


  const setExampleGenes = () => {
    // Load example genes for the selected organism
    const organism = organisms[organismIndex];
    const genes = exampleGenes[organism.speciesNomenclature.nomenclatureCode];
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
  };
  const handleTrackCollectionChange = (event) => {
    setTrackCollectionId(event.target.value);
  };
  const handleRegRegionChange = (event) => {
    setRegRegion(event.target.value);
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
          sx={{ mt: 1, pb: 1, pl: isMobile ? 3.25 : 0, width: '100%' }}
        >
          <FormGroup row sx={{ width: '100%' }}>
            <FormSelect
              label="Type of Search Space"
              options={searchSpaceTypeOptions}
              initialValue={searchSpaceTypeId}
              isMobile={isMobile}
              onChange={handleSearchSpaceTypeChange}
            />
            <FormSelect
              label="Motif Collection"
              options={motifCollectionOptions}
              initialValue={motifCollectionId}
              isMobile={isMobile}
              onChange={handleMotifCollectionChange}
            />
            <FormSelect
              label="Track Collection"
              options={trackCollectionOptions}
              initialValue={trackCollectionId}
              isMobile={isMobile}
              onChange={handleTrackCollectionChange}
            />
            <FormSelect
              label="Putative Regulatory Region"
              options={regRegionOptions}
              initialValue={regRegion}
              isMobile={isMobile}
              onChange={handleRegRegionChange}
            />
            <FormSelect
              label="Motif Rankings Database"
              options={motifRankingsDbOptions}
              initialValue={motifRankingsDbId}
              isMobile={isMobile}
              onChange={handleMotifRankingsDbChange}
            />
            <FormSelect
              label="Track Rankings Database"
              options={trackRankingsDbOptions}
              initialValue={trackRankingsDbId}
              isMobile={isMobile}
              onChange={handleTrackRankingsDbChange}
            />
          </FormGroup>
          <FormGroup row sx={{ width: '100%' }}>
            <FormTextField
              label="Overlap Fraction"
              initialValue={overlapFraction}
              disabled={searchSpaceTypeId !== 'regions'}
              isMobile={isMobile}
              onChange={handleOverlapFractionChange}
            />
            <FormSelect
              label="Regulatory Search Space"
              options={{}}
              initialValue={regSearchSpace}
              disabled={searchSpaceTypeId !== 'regions'}
              isMobile={isMobile}
              onChange={handleRegRegionChange}
            />
            <FormTextField
              label="Upstream Region"
              initialValue={upstreamRegion}
              disabled={searchSpaceTypeId !== 'regions'}
              isMobile={isMobile}
              onChange={handleUpstreamRegionChange}
            />
            <FormTextField
              label="Downstream Region"
              initialValue={downstreamRegion}
              disabled={searchSpaceTypeId !== 'regions'}
              isMobile={isMobile}
              onChange={handleDownstreamRegionChange}
            />
          </FormGroup>
          <FormGroup row sx={{ width: '100%' }}>
            <FormTextField label="Enrichment Score Threshold" initialValue={nes} isMobile={isMobile} onChange={handleNESChange} />
            <FormTextField label="ROC Threshold for AUC Calculation" initialValue={auc} isMobile={isMobile} onChange={handleAUCChange} />
            <FormTextField label="Rank Threshold" initialValue={rank} isMobile={isMobile} onChange={handleRankChange} />
          </FormGroup>
          <FormGroup row sx={{ width: '100%' }}>
            <FormTextField label="Min. Identity Between Orthologous Genes" initialValue={orthologousId} isMobile={isMobile} onChange={handleOrthologousIdChange} />
            <FormTextField label="Max. FDR on Motif Similarity" initialValue={fdr} isMobile={isMobile} onChange={handleFDRChange} />
          </FormGroup>
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