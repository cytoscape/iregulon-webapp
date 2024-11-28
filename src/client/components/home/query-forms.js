import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from "react-query";
import {
  Box,
  Checkbox,
  FormControl,
  FormLabel,
  FormControlLabel,
  FormHelperText,
  Select,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  Link,
  Tooltip,
} from '@mui/material';
import { FlyIcon, HumanIcon, MouseIcon } from '../svg-icons';


export const organisms = [
  {
    id: '5',
    name: 'Homo sapiens',
    assembly: 'hg38',
    nomenclatureCode: 1,
    nomenclature: 'HGNC symbols',
    icon: (props) => <HumanIcon {...props} />,
  },
  {
    id: '1',
    name: 'Homo sapiens',
    assembly: 'hg19',
    nomenclatureCode: 1,
    nomenclature: 'HGNC symbols',
    icon: (props) => <HumanIcon {...props} />,
  },
  {
    id: '6',
    name: 'Mus musculus',
    assembly: 'mm10',
    nomenclatureCode: 2,
    nomenclature: 'MGI symbols',
    icon: (props) => <MouseIcon {...props} />,
  },
  {
    id: '2',
    name: 'Mus musculus',
    assembly: 'mm9',
    nomenclatureCode: 2,
    nomenclature: 'MGI symbols',
    icon: (props) => <MouseIcon {...props} />,
  },
  {
    id: '4',
    name: 'Drosophila melanogaster',
    assembly: 'dm6',
    nomenclatureCode: 3,
    nomenclature: 'FlyBase names',
    icon: (props) => <FlyIcon {...props} />,
  },
  {
    id: '3',
    name: 'Drosophila melanogaster',
    assembly: 'dm3',
    nomenclatureCode: 3,
    nomenclature: 'FlyBase names',
    icon: (props) => <FlyIcon {...props} />,
  },
];

const METATARGETOME_SPECIES_NOMENCLATURE_ID = 1;
const METATARGETOME_SPECIES_NOMENCLATURE_CODE = 1;

//==[ PredictedRegulatorsForm ]=======================================================================================

function parseGeneList(text) {
  if (text.length > 0) {
    let parts = text.split(/[\s,]+/);
    parts = parts.filter(el => el.length > 0);
    return [...new Set(parts)];
  }
  return [];
}

export function PredictedRegulatorsForm({ initialOrganism, isMobile, onOrganismChanged, onGenesChanged }) {
  const [ organism, setOrganism ] = useState(organisms.indexOf(initialOrganism));

  const geneInputRef = useRef();

  const handleOrganismChange = (event) => {
    const idx = event.target.value;
    setOrganism(idx);
    onOrganismChanged(organisms[idx]);
  };
  const handleGenesChange = (event) => {
    const txt = event.target.value;
    const genes = parseGeneList(txt);
    onGenesChanged(genes);
  };

  const setExampleGenes = () => {
    // Select the first organism (must be `human`!)
    const orgIdx = 0; 
    setOrganism(orgIdx);
    onOrganismChanged(organisms[orgIdx]);
    // Genes frequently mutated in prostate cancer (from GeneMANIA)
    const exampleGenes = [
      'AR', 'BDH1', 'CYB5A', 'CYP11A1', 'CYP11B1', 'CYP11B2', 'CYP17A1', 'CYP19A1', 'CYP21A2',
      'DCXR', 'DECR2', 'DHRS1', 'DHRS11', 'DHRS13', 'DHRS2', 'DHRS4', 'DHRS4L2', 'DHRS7B', 'HSD11B1L',
      'HSD17B1', 'HSD17B10', 'HSD17B11', 'HSD17B12', 'HSD17B13', 'HSD17B14', 'HSD17B2', 'HSD17B3',
      'HSD17B4', 'HSD17B6', 'HSD17B7', 'HSD17B8', 'HSD3B1', 'HSD3B2', 'HSD3B7', 'HSDL1', 'HSDL2',
      'PECR', 'RDH10', 'RDH5', 'RDH8', 'SDR16C5', 'SHBG', 'SRD5A1', 'SRD5A3', 'STAR', 'TECR', 'TECRL'
    ];
    geneInputRef.current.value = exampleGenes.join(' ');
    onGenesChanged(exampleGenes);
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="flex-start" gap={2}>
      <FormControl variant="filled" size="small">
        <Select
          variant="outlined"
          displayEmpty
          value={organism}
          onChange={handleOrganismChange}
          renderValue={(idx) => {
            return (
              <Box display="flex" gap={1}>
                {idx !== '' ?
                  <>
                    { organisms[idx].icon({color: 'inherit', fontSize: 'medium'}) }
                    { organisms[idx].name} &#40;{organisms[idx].assembly}&#41;
                  </>
                  :
                  <Typography variant="body2">-- Select an organism --</Typography>
                }
              </Box>
            );
          }}
        >
          {organisms.map(({ id, name, assembly, nomenclature, icon }, idx) => (
            <MenuItem key={id} value={idx}>
              <ListItemIcon sx={{ pr: 2, color: (theme) => theme.palette.text.primary }}>
                { icon({ color: 'inherit', fontSize: 'large' }) }
              </ListItemIcon>
              <ListItemText primary={`${name} (${assembly})`} secondary={nomenclature} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ width: '100%' }}>
        <TextField
          inputRef={geneInputRef}
          aria-label="gene-list"
          placeholder="Enter gene list"
          multiline
          fullWidth
          minRows={isMobile ? 8 : 12}
          maxRows={isMobile ? 8 : 12}
          inputProps={{ spellCheck: false }}
          sx={{ minWidth: { sm: 400 } }}
          onChange={handleGenesChange}
        />
        <FormHelperText sx={{ textAlign: 'right' }}>
          <Tooltip title="Try it with some example genes (prostate cancer)" arrow>
            <Link underline="hover" onClick={setExampleGenes} >
              Example
            </Link>
          </Tooltip>
        </FormHelperText>
      </FormControl>
    </Box>
  );
}
PredictedRegulatorsForm.propTypes = {
  initialOrganism: PropTypes.object.isRequired,
  isMobile: PropTypes.bool,
  onOrganismChanged: PropTypes.func,
  onGenesChanged: PropTypes.func,
};

//==[ MetatargetomeForm ]=============================================================================================

const targetomeDatabases = [
  { id: 'msigdb', name: 'MSigDB' },
  { id: 'genesigdb', name: 'GeneSigDB' },
  { id: 'ganesh', name: 'Ganesh Clusters' },
];

export function MetatargetomeForm({ isMobile, onTranscriptionFactorChanged, onTargetomeDatabasesChanged }) {
  const [ selectedTF, setSeletedTF ] = useState('');
  const [ selectedDatabases, setSelectedDatabases ] = useState(
    targetomeDatabases.reduce((obj, { id }) => {
      obj[id] = true;
      return obj;
    }, {})
  );

  useEffect(() => {
    onTargetomeDatabasesChanged(Object.keys(selectedDatabases));
  }, []);

  const queryTFsData = useQuery(
    ['tfs-targetome', METATARGETOME_SPECIES_NOMENCLATURE_CODE],
    () =>
      fetch(`/api/create/queryTranscriptionFactorsWithPredictedTargetome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SpeciesNomenclatureCode: METATARGETOME_SPECIES_NOMENCLATURE_CODE })
      })
    .then(res => res.json()),
    {
      retry: 2,
      retryDelay: 3000,
      staleTime: 24 * 3600000, // After 24 hours, the cached data becomes stale and a refetch can happen
    }
  );

  const data = queryTFsData.data;
  const isLoading = queryTFsData.isLoading;

  let error = queryTFsData.error;
  let transcriptionFactors = [];
  if (!isLoading && !error && data) {
    transcriptionFactors = data.transcriptionFactors;
  }
  
  const handleTFChange = (event) => {
    const tf = event.target.value;
    setSeletedTF(tf);
    onTranscriptionFactorChanged(tf);
  };
  const handleTargetomeDBsChange = (event) => {
    const newSelected = {
      ...selectedDatabases,
      [event.target.value]: event.target.checked,
    };
    setSelectedDatabases(newSelected);
    onTargetomeDatabasesChanged(Object.keys(newSelected).filter(key => newSelected[key]));
  };

  const defaultOrganism = organisms.filter((org) => org.nomenclatureCode === METATARGETOME_SPECIES_NOMENCLATURE_ID)[0];

  return (
    <Box display="flex" flexDirection="column" alignItems="flex-start" gap={2}>
      <FormControl variant="filled" size="small">
        <Select
          variant="outlined"
          displayEmpty
          value={selectedTF}
          onChange={handleTFChange}
          renderValue={(val) => {
            return (
              <Box display="flex" gap={1}>
                {val !== '' ?
                  <>
                    { val }
                  </>
                  :
                  <Typography variant="body2">-- Select a transcription factor --</Typography>
                }
              </Box>
            );
          }}
        >
          {transcriptionFactors.map((tf) => (
            <MenuItem key={tf} value={tf}>
              <ListItemText primary={tf} />
            </MenuItem>
          ))}
        </Select>
        <FormHelperText sx={{ color: (theme) => theme.palette.text.disabled }}>
          *{ defaultOrganism.name } &#40;{ defaultOrganism.assembly }&#41; &mdash; { defaultOrganism.nomenclature }
        </FormHelperText>
      </FormControl>
      <FormControl variant="filled" size="small" label="Parent" onChange={handleTargetomeDBsChange}>
        <FormLabel component="legend" sx={{ mt: 2, mb: 1 }}>
          Databases:
        </FormLabel>
        {targetomeDatabases.map(({ id, name }) => (
          <FormControlLabel
            key={id}
            label={name}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '1em' } }}
            control={
              <Checkbox
                size="small"
                value={id}
                checked={Boolean(selectedDatabases[id])}
                sx={{ py: 0.25 }}
              />
            }
          />
        ))}
      </FormControl>
    </Box>
  );
}
MetatargetomeForm.propTypes = {
  isMobile: PropTypes.bool,
  onTranscriptionFactorChanged: PropTypes.func,
  onTargetomeDatabasesChanged: PropTypes.func,
};