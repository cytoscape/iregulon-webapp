import React, { useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import { RNA_SEQ, PRE_RANKED } from './upload-controller';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { Box, Paper, Typography, Link } from '@mui/material';
import { FormControl, Select, MenuItem, ListItemIcon, ListItemText, TextField } from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

//==[ UploadPanel ]===================================================================================================

const useUploadPanelStyles = makeStyles((theme) => ({
  description: {
    marginBottom: theme.spacing(2.5),
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing(1),
      fontSize: '0.85rem',
    },
  },
  details: {
    marginTop: 0,
    [theme.breakpoints.down('sm')]: {
      marginBlockStart: 0,
      marginBlockEnd: theme.spacing(1),
      fontSize: '0.85rem',
    },
  },
  archerContainer: {
    width: '100%',
  },
  legendContainer: {
    width: '100%',
  },
  legend: {
    position:'absolute',
    padding: 5,
    fontSize: '0.85em',
    color: theme.palette.text.secondary,
    cursor: 'default',
    border: `1px solid transparent`,
    "&:hover": {
      color: theme.palette.text.primary,
    },
  },
  linkout: {
    color: 'inherit',
    borderBottom: 'dotted 1px',
  },
}));

function parseGeneList(text) {
  if (text.length > 0) {
    let parts = text.split(/[\s,]+/);
    parts = parts.filter(el => el.length > 0);
    return [...new Set(parts)];
  }
  return [];
}

export function UploadPanel({ initialOrganism, isMobile, onOrganismChanged, onGenesChanged }) {
  const [ organism, setOrganism ] = useState(organisms.indexOf(initialOrganism));

  const classes = useUploadPanelStyles();
  const theme = useTheme();
  
  const handleOrganismChange = (event) => {
    const idx = event.target.value;
    console.log(idx);
    setOrganism(idx);
    onOrganismChanged(organisms[idx]);
  };
  const handleGenesChange = (event) => {
    const txt = event.target.value;
    console.log(txt);
    const genes = parseGeneList(txt);
    console.log(genes);
    onGenesChanged(genes);
  };

  const linkoutProps = { target: "_blank",  rel: "noreferrer", underline: "none" };
  const GeneIdLabel = () => (
    <>
      <b>Gene ID Column:</b>&nbsp;&nbsp;from&nbsp;
      <Link href="https://www.ensembl.org/Homo_sapiens/Info/Index" className={classes.linkout} {...linkoutProps}>Ensembl</Link> or&nbsp;
      <Link href="https://www.genenames.org/" className={classes.linkout} {...linkoutProps}>HGNC</Link>&nbsp;
      &#40;for human&#41;
    </>
  );

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
              <ListItemIcon className={classes.organismIcon}>
                { icon({color: 'inherit', fontSize: 'large'}) }
              </ListItemIcon>
              <ListItemText primary={`${name} (${assembly})`} secondary={nomenclature} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        aria-label="gene-list"
        placeholder="Enter gene list"
        multiline
        minRows={isMobile ? 10 : 6}
        sx={{ minWidth: { sm: 400 }, width: '100%' }}
        onChange={handleGenesChange}
      />
    </Box>
  );
}
UploadPanel.propTypes = {
  initialOrganism: PropTypes.object.isRequired,
  isMobile: PropTypes.bool,
  onOrganismChanged: PropTypes.func,
  onGenesChanged: PropTypes.func,
};

//==[ DemoPanel ]=====================================================================================================

const useDemoPanelStyles = makeStyles((theme) => ({
  thumbnail: {
    backgroundColor: theme.palette.background.network,
    border: `4px solid ${theme.palette.divider}`,
    borderRadius: '8px',
    width: '100%',
    margin: theme.spacing(2.5, 0, 2.5, 0),
  },
}));

export function DemoPanel() {
  const classes = useDemoPanelStyles();
  return <>
    <Typography component="p" variant="body1" className={classes.description}>
      Create a demo network from sample genes.
    </Typography>
    <img
      className={classes.thumbnail}
      alt="thumbnail of demo network"
      src="/images/demo_small.png"
    />
    <Typography component="p" variant="body1">
      The data used to create this network is described in the&nbsp;
      <Link 
          target="_blank" // open in new tab
          rel="noopener"
          href="http://iregulon.aertslab.org/tutorial.html/">
        iRegulon Tutorial
      </Link>.
    </Typography>
  </>;
}
DemoPanel.propTypes = {
};

