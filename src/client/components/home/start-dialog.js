import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { PredictedRegulatorsForm, MetatargetomeForm, organisms } from './query-forms';
import DemoPanel from './demo-panel';

import { makeStyles } from '@mui/styles';

import { Box, Button, Typography } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Accordion, AccordionDetails, AccordionSummary, Radio } from '@mui/material';

import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import CircularProgressIcon from '@mui/material/CircularProgress';


const REGULATORS_QUERY = 'regulators';
const METATARGETOMES_QUERY = 'metatargetomes';
const DEFAULT_QUERY_TYPE = REGULATORS_QUERY;

const DEF_ORGANISM = organisms[0];


//==[ QueryTypeAccordion ]============================================================================================

const useQueryTypeAccordionStyles = makeStyles((theme) => ({
  summaryRoot: {
    minHeight: `48px !important`,
    padding: theme.spacing(0, 2, 0, 1),
    [theme.breakpoints.down('xs')]: {
      padding: theme.spacing(0, 1, 0, 0),
    },
  },
  summaryContent: {
    alignItems: 'center',
    margin: `${theme.spacing(0.5, 0)} !important`,
  },
  title: {
    fontSize: 'theme.typography.pxToRem(15)',
    fontWeight: theme.typography.fontWeightRegular,
  },
  details: {
    width: '100%',
    justifyContent: 'center',
    padding: theme.spacing(3, 2, 1, 6),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1.5, 2, 1, 6),
    },
  },
}));

const QueryTypeAccordion = ({ id, title, children, selected, onChange }) => {
  const classes = useQueryTypeAccordionStyles();

  return (
    <Accordion expanded={selected} variant="outlined" onChange={onChange(id)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} classes={{ root: classes.summaryRoot, content: classes.summaryContent }}>
        <Radio
          checked={selected}
          onChange={onChange(id)}
          value={id}
          name={title}
        />
        <Typography className={classes.title}>{ title }</Typography>
      </AccordionSummary>
      <AccordionDetails className={classes.details}>
        { children }
      </AccordionDetails>
    </Accordion>
  );
};
QueryTypeAccordion.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired,
  selected: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

//==[ QueryPanel ]====================================================================================================

export function QueryPanel({
  isMobile,
  initialQueryType,
  onQueryTypeChanged,
  onOrganismChanged,
  onGenesChanged,
  onTranscriptionFactorChanged,
  onTargetomeDatabasesChanged,
}) {
  const [ queryType, setQueryType ] = useState(initialQueryType);

  const handleChange = (value) => (event, select) => {
    if (select) { // clicking an expanded accordion should not collapse it
      setQueryType(value);
      onQueryTypeChanged(value);
    }
  };

  return (
    <Box sx={{ height: '100%', p: 1, bgcolor: (theme) => theme.palette.background.default }}>
      <QueryTypeAccordion
        id={REGULATORS_QUERY}
        title="Predict Regulators and Targets"
        selected={queryType === REGULATORS_QUERY}
        onChange={handleChange}
      >
        <PredictedRegulatorsForm
          isMobile={isMobile}
          initialOrganism={DEF_ORGANISM}
          onOrganismChanged={onOrganismChanged}
          onGenesChanged={onGenesChanged}
        />
      </QueryTypeAccordion>
      <QueryTypeAccordion
        id={METATARGETOMES_QUERY}
        title="Predict Metatargetomes"
        selected={queryType === METATARGETOMES_QUERY}
        onChange={handleChange}
      >
        <MetatargetomeForm
          isMobile={isMobile}
          onTranscriptionFactorChanged={onTranscriptionFactorChanged}
          onTargetomeDatabasesChanged={onTargetomeDatabasesChanged}
        />
      </QueryTypeAccordion>
    </Box>
  );
}
QueryPanel.propTypes = {
  isMobile: PropTypes.bool,
  initialQueryType: PropTypes.string.isRequired,
  onQueryTypeChanged: PropTypes.func.isRequired,
  onOrganismChanged: PropTypes.func.isRequired,
  onGenesChanged: PropTypes.func.isRequired,
  onTranscriptionFactorChanged: PropTypes.func.isRequired,
  onTargetomeDatabasesChanged: PropTypes.func.isRequired,
};

//==[ StartDialog ]===================================================================================================

const useStartDialogStyles = makeStyles((theme) => ({
  titleRoot: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 1),
    },
  },
  progress: {
    display: 'flex',
    flexDirection: 'column',
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 320,
    textAlign: 'center',
    padding: theme.spacing(2),
  },
}));

const StartDialog = ({ 
  step,
  isMobile,
  isDemo,
  errorMessages,
  onSubmit,
  onCancelled,
}) => {
  const [ submitDisabled, setSubmitDisabled ] = useState(true);
  
  const classes = useStartDialogStyles();
  const open = step !== 'WAITING';

  const queryTypeRef = useRef(DEFAULT_QUERY_TYPE); // needs to be a ref for the accordion animation to work

  // REGULATORS_QUERY
  const organismRef = useRef(DEF_ORGANISM);
  const genesRef = useRef([]);
  // METATARGETOMES_QUERY
  const transcriptionFactorRef = useRef('');
  const databasesRef = useRef([]);

  const updateSubmitDisabled = () => {
    if (queryTypeRef.current === REGULATORS_QUERY) {
      setSubmitDisabled(genesRef.current.length === 0);
    } else {
      setSubmitDisabled(transcriptionFactorRef.current === '' || databasesRef.current.length === 0);
    }
  };

  const handleQueryTypeChanged = (type) => {
    queryTypeRef.current = type;
    updateSubmitDisabled();
  };

  const handleOrganismChanged = (organism) => {
    organismRef.current = organism;
  };
  const handleGenesChanged = (genes) => {
    genesRef.current = genes;
    updateSubmitDisabled();
  };
  
  const handleTranscriptionFactorChanged = (tf) => {
    transcriptionFactorRef.current = tf;
    updateSubmitDisabled();
  };
  const handleTargetomeDatabasesChanged = (databases) => {
    databasesRef.current = databases;
    updateSubmitDisabled();
  };

  const handleSubmit = () => {
    if (isDemo) {
      onSubmit({ demo: true });
    } else if (queryTypeRef.current === REGULATORS_QUERY) {
      onSubmit({ organism: organismRef.current, genes: genesRef.current });
    } else {
      onSubmit({ transcriptionFactor: transcriptionFactorRef.current, databases: databasesRef.current });
    }
  };

  const LoadingProgress = () => 
    <div className={classes.progress}>
      <CircularProgressIcon color="primary" />
      <Typography component="p" variant="body1">Preparing your figure...</Typography>
      <Typography component="p" variant="body1">This will take about a minute.</Typography>
    </div>;

  const ErrorReport = () => {
    return (
      <div className={classes.progress}>
        <WarningIcon fontSize="large" color="error" />
        {
          (!errorMessages || errorMessages.length == 0)
          ? <>
              <Typography variant="body1">We were unable to process your experimental data.</Typography>
              <br />
              <Typography variant="body2" color="secondary">
                Please ensure that your data is formatted properly,<br />either in <i>RNA&#8209;Seq Expression</i> format or in <i>Pre-Ranked Gene</i> format.
              </Typography>
            </>
          : errorMessages.slice(0,7).map((message, index) =>
              <p key={index} style={{whiteSpace: "pre-wrap"}}>{message}</p>
            )
        }
      </div>
    );
  };

  return (
    <Dialog maxWidth={isDemo ? 'xs' : 'sm'} fullScreen={isMobile} open={open}>
      <DialogTitle classes={{ root: classes.titleRoot }}>
      {
        {
          'INPUT':   () => isDemo ? 'Create Demo Network' : 'Query iRegulon',
          'LOADING': () => 'Loading',
          'ERROR':   () => 'Error',
        }[step]()
      }
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
      { 
        {
          'INPUT':   () => isDemo ?
                            <DemoPanel /> : 
                            <QueryPanel 
                              isMobile={isMobile}
                              initialQueryType={queryTypeRef.current} 
                              onQueryTypeChanged={handleQueryTypeChanged}
                              onOrganismChanged={handleOrganismChanged}
                              onGenesChanged={handleGenesChanged}
                              onTranscriptionFactorChanged={handleTranscriptionFactorChanged}
                              onTargetomeDatabasesChanged={handleTargetomeDatabasesChanged}
                            />,
          'LOADING': () => <LoadingProgress />,
          'ERROR':   () => <ErrorReport />,
        }[step]()
      }
      </DialogContent>
      <DialogActions>
      <span style={{flexGrow: 1}} />
      <Button
        autoFocus
        variant="outlined"
        color="primary" 
        startIcon={step !== 'ERROR' ? <CloseIcon /> : null} 
        onClick={onCancelled}
      >
        { step === 'ERROR' ? 'OK' : 'Cancel' }
      </Button>
      {step === 'INPUT' && (
        <Button
          variant="contained"
          color="primary" 
          endIcon={<NavigateNextIcon />} 
          disabled={isDemo ? false : submitDisabled}
          onClick={handleSubmit}
        >
          Submit
        </Button>
      )}
      </DialogActions>
    </Dialog>
  );
};

StartDialog.propTypes = {
  step: PropTypes.string.isRequired,
  isMobile: PropTypes.bool,
  isDemo: PropTypes.bool,
  errorMessages: PropTypes.array,
  onSubmit: PropTypes.func.isRequired,
  onCancelled: PropTypes.func.isRequired,
};

export default StartDialog;