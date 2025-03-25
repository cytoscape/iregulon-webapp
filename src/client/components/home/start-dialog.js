import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

import DataConfig from '../../data-config';
import { organismParams as organisms } from '../../../util';
import { QueryForm } from './query-form';
import { DemoPanel } from './demo-panel';

import makeStyles from '@mui/styles/makeStyles';

import { Button, Typography } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

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
  dataConfig,
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
  const advancedOptionsRef = useRef({});

  const validateForm = () => {
    let valid = true;
    if (genesRef.current.length === 0) {
      valid = false;
    } else {
      const advancedOptions = advancedOptionsRef.current;
      if (advancedOptions?.errors && Object.keys(advancedOptions.errors).length > 0) {
        valid = false;
      } else {
        // If neither motif nor track collections are valid, it cannot submit the form
        const hasMotifCollection = advancedOptions?.motifCollectionId !== 'none';
        const hasTrackCollection = advancedOptions?.trackCollectionId !== 'none';
        if (!hasMotifCollection && !hasTrackCollection) {
          valid = false;
        }
      }
    }
    setSubmitDisabled(!valid);
  };

  const handleOrganismChange = (organism) => {
    organismRef.current = organism;
  };
  const handleGenesChange = (genes) => {
    genesRef.current = genes;
    validateForm();
  };
  const handleAdvancedOptionsChange = (options) => {
    advancedOptionsRef.current = options;
    validateForm();
  };

  const LoadingProgress = () => 
    <div className={classes.progress}>
      <CircularProgressIcon color="primary" />
      <Typography component="p" variant="body1">Preparing your figure...</Typography>
      <Typography component="p" variant="body1">This will take a couple of minutes.</Typography>
    </div>;

  const ErrorReport = () => {
    return (
      <div className={classes.progress}>
        <WarningIcon fontSize="large" color="error" />
        {
          (!errorMessages || errorMessages.length == 0)
          ? <>
              <Typography variant="body2">We were unable to process your submitted data at this moment.</Typography>
              <br />
              <Typography variant="body2">Please try again later.</Typography>
            </>
          : errorMessages.slice(0, 7).map((message, index) =>
              <Typography key={index} variant="body2" sx={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                { message }
              </Typography>
            )
        }
      </div>
    );
  };

  return (
    <Dialog maxWidth={isDemo ? 'xs' : 'md'} fullScreen={isMobile} open={open}>
      <DialogTitle classes={{ root: classes.titleRoot }}>
      {
        {
          'INPUT':   () => isDemo ? 'Create Demo Network' : 'Predict Regulators and Targets',
          'LOADING': () => 'Loading',
          'ERROR':   () => 'Error',
        }[step]()
      }
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
      { 
        {
          'INPUT':   () => isDemo ?
                            <DemoPanel isMobile={isMobile} /> : 
                            <QueryForm
                              dataConfig={dataConfig}
                              initialOrganism={DEF_ORGANISM}
                              isMobile={isMobile}
                              onOrganismChange={handleOrganismChange}
                              onGenesChange={handleGenesChange}
                              onAdvancedOptionsChange={handleAdvancedOptionsChange}
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
  dataConfig: PropTypes.instanceOf(DataConfig).isRequired,
  isMobile: PropTypes.bool,
  isDemo: PropTypes.bool,
  errorMessages: PropTypes.array,
  onSubmit: PropTypes.func.isRequired,
  onCancelled: PropTypes.func.isRequired,
};

export default StartDialog;