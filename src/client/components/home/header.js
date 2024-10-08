import React from 'react';
import PropTypes from 'prop-types';

import makeStyles from '@mui/styles/makeStyles';

import { AppBar, Toolbar, MenuItem } from '@mui/material';
import { Container, Divider } from '@mui/material';
import { Button, Typography } from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import { AppLogoIcon } from '../svg-icons';
import { openPageLink } from '../util';


const useHeaderStyles = makeStyles(theme => ({
  appBar: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
  toolbar: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: {
      paddingLeft: theme.spacing(1.5),
      paddingRight: theme.spacing(1.5),
    },
  },
  logo: {
    fontSize: 48,
    [theme.breakpoints.down('sm')]: {
      fontSize: 36,
    },
  },
  title: {
    marginLeft: theme.spacing(0.5),
    color: '#666666',
    fontSize: '1.5em',
    fontWeight: 'bold',
    flexGrow: 1,
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.25em',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      textWrap: 'nowrap',
    },
  },
  menuItem: {
    borderRadius: 8,
  },
  menuButton: {
    minWidth: 36,
    width: 36,
    height: 36,
  },
  divider: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    border: 'none',
    [theme.breakpoints.down('sm')]: {
      marginLeft: theme.spacing(0.5),
      marginRight: theme.spacing(0.5),
    },
  },
  unrelatedDivider: {
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    border: 'none',
    [theme.breakpoints.down('sm')]: {
      marginLeft: theme.spacing(2),
      marginRight: theme.spacing(2),
    },
  },
}));

export function Header({ menuDef, showRecentNetworks, mobile, tablet, onClickGetStarted, onOpenMobileMenu }) {
  const classes = useHeaderStyles();

  const handleClick = (href, target) => {
    openPageLink(href, target);
  };

  const ToolbarDivider = ({ unrelated }) => {
    return <Divider orientation="vertical" flexItem variant="middle" className={unrelated ? classes.unrelatedDivider : classes.divider} />;
  };
  ToolbarDivider.propTypes = {
    unrelated: PropTypes.bool
  };

  return (
    <AppBar position="static" color="transparent" className={classes.appBar}>
      <Container maxWidth="lg" disableGutters>
        <Toolbar variant="regular" className={classes.toolbar}>
          <AppLogoIcon className={classes.logo} />
          <Typography variant="inherit" className={classes.title}><span style={{color: '#3a88fe'}}>i</span>Regulon</Typography>
        {!mobile && !tablet && menuDef.map((menu, idx) => (
          <MenuItem key={idx} className={classes.menuItem} onClick={() => handleClick(menu.href, menu.target)}>
            { menu.label }
          </MenuItem>
        ))}
        {showRecentNetworks && !mobile && (
          <>
            <ToolbarDivider />
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={onClickGetStarted}
            >
              Get Started
            </Button>
          </>
        )}
        {(mobile || tablet) && (
          <>
            <ToolbarDivider />
            <Button color="inherit" className={classes.menuButton} onClick={onOpenMobileMenu}>
              <MenuIcon />
            </Button>
          </>
        )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
Header.propTypes = {
  menuDef: PropTypes.array.isRequired,
  showRecentNetworks: PropTypes.bool,
  mobile: PropTypes.bool,
  tablet: PropTypes.bool,
  onClickGetStarted: PropTypes.func,
  onOpenMobileMenu: PropTypes.func,
};

export default Header;