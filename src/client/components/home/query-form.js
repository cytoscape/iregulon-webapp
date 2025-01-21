import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { organismParams as organisms } from '../../../util';
import {
  Box,
  FormControl,
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
import { FlyIcon, HumanIcon, MouseIcon } from '../svg-icons';


const organismIcons = {
  '1': (props) => <HumanIcon {...props} />,
  '2': (props) => <MouseIcon {...props} />,
  '3': (props) => <FlyIcon {...props} />,
  '4': (props) => <FlyIcon {...props} />,
  '5': (props) => <HumanIcon {...props} />,
  '6': (props) => <MouseIcon {...props} />,
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

export function QueryForm({ initialOrganism, isMobile, onOrganismChanged, onGenesChanged }) {
  const [ organism, setOrganism ] = useState(organisms.indexOf(initialOrganism));

  const geneInputRef = useRef();

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
                    { organismIcons[organisms[idx].speciesNomenclature.id]({color: 'inherit', fontSize: 'medium'}) }
                    { organisms[idx].speciesNomenclature.name} &#40;{organisms[idx].speciesNomenclature.assembly}&#41;
                  </>
                  :
                  <Typography variant="body2">-- Select an organism --</Typography>
                }
              </Box>
            );
          }}
        >
          {organisms.map(({ speciesNomenclature }, idx) => (
            <MenuItem key={speciesNomenclature.id} value={idx}>
              <ListItemIcon sx={{ pr: 2, color: (theme) => theme.palette.text.primary }}>
                { organismIcons[speciesNomenclature.id]({ color: 'inherit', fontSize: 'large' }) }
              </ListItemIcon>
              <ListItemText primary={`${speciesNomenclature.name} (${speciesNomenclature.assembly})`} secondary={speciesNomenclature.nomenclature} />
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
  );
}
QueryForm.propTypes = {
  initialOrganism: PropTypes.object.isRequired,
  isMobile: PropTypes.bool,
  onOrganismChanged: PropTypes.func,
  onGenesChanged: PropTypes.func,
};