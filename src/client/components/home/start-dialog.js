import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { QueryPanel, DemoPanel, organisms } from './query-panel';

import makeStyles from '@mui/styles/makeStyles';

import { Button, Typography } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import CircularProgressIcon from '@mui/material/CircularProgress';


const DEF_ORGANISM = organisms[0];

const useStyles = makeStyles((theme) => ({
  titleRoot: {
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 1),
    },
  },
  dividers: {
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

  const classes = useStyles();
  const open = step !== 'WAITING';

  const organismRef = useRef(DEF_ORGANISM);
  const genesRef = useRef([]);

  const hanleOrganismChanged = (organism) => {
    organismRef.current = organism;
  };
  const hanleGenesChanged = (genes) => {
    genesRef.current = genes;
    setSubmitDisabled(genes.length === 0);
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
          'INPUT':   () => isDemo ? 'Create Demo Network' : 'Predict Regulators and Targets',
          'LOADING': () => 'Loading',
          'ERROR':   () => 'Error',
        }[step]()
      }
      </DialogTitle>
      <DialogContent dividers classes={{ dividers: classes.dividers }}>
      { 
        {
          'INPUT':   () => isDemo ?
                            <DemoPanel /> : 
                            <QueryPanel isMobile={isMobile} initialOrganism={DEF_ORGANISM} onOrganismChanged={hanleOrganismChanged} onGenesChanged={hanleGenesChanged} />,
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
          onClick={() => isDemo ? onSubmit({ demo: true }) : onSubmit({ organism: organismRef.current, genes: genesRef.current })}
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