import React from 'react';
import makeStyles from '@mui/styles/makeStyles';

import { linkoutProps } from '../defaults';
import Citation from './citation';

import { Container, Link, Typography } from '@mui/material';

import { AppLogoIcon } from '../svg-icons';


const useStyles = makeStyles(theme => ({
  logo: {
    width: 192,
    height: 'auto',
    marginBottom: theme.spacing(4),
    [theme.breakpoints.down('sm')]: {
      width: 144,
      marginBottom: theme.spacing(2),
    },
  },
  subtitle: {
    fontSize: '1.85rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.5rem',
    },
  },
  citeContainer: {
    paddingLeft: 0,
    paddingRight: 0,
    marginTop: theme.spacing(6),
    marginBottom: theme.spacing(6),
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },
  },
  description: {
    marginBottom: theme.spacing(4),
    textAlign: 'left',
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing(2),
      fontSize: 'unset',
    },
  },
}));

export function About() {
  const classes = useStyles();

  return (
    <>
      <div style={{textAlign: 'center'}}>
        <AppLogoIcon className={classes.logo} />
      </div>
      <Container maxWidth="md" className={classes.citeContainer}>
        <Typography variant="h3" className={classes.subtitle}>Cite iRegulon</Typography>
        <Typography variant="body1" color="textSecondary" className={classes.description}>
          To cite this app in a paper, for now, please cite this article &#40;an article specific to this app will be published shortly&#41;:
        </Typography>
        <Citation />
      </Container>
    </>
  );
}

export default About;