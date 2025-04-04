import React from 'react';
import PropTypes from 'prop-types';
import makeStyles from '@mui/styles/makeStyles';
import { Box, Typography, Link } from '@mui/material';


const useDemoPanelStyles = makeStyles((theme) => ({
  thumbnail: {
    backgroundColor: theme.palette.background.network,
    border: `4px solid ${theme.palette.divider}`,
    borderRadius: '8px',
    width: '100%',
    margin: theme.spacing(2.5, 0, 2.5, 0),
  },
}));

export function DemoPanel({ isMobile }) {
  const classes = useDemoPanelStyles();
  return (
    <Box sx={{ py: 2, px: isMobile ? 1 : 3 }}>
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
            href="http://iregulon.aertslab.org/tutorial.html">
          iRegulon Tutorial
        </Link>.
      </Typography>
    </Box>
  );
}
DemoPanel.propTypes = {
  isMobile: PropTypes.bool,
};