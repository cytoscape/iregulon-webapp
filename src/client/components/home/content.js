import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EventEmitter from 'eventemitter3';
import clsx from 'clsx';
import classNames from 'classnames';
import uuid from 'uuid';

import { useTheme } from '@mui/material/styles';

import makeStyles from '@mui/styles/makeStyles';

import { DataConfig } from '../../data-config';
import { speciesNomenclatureDef } from '../../../util';
import { RecentNetworksController } from '../recent-networks-controller';
import { QueryController } from './query-controller';
import RecentNetworksList from './recent-networks-list';
import Header from './header';
import Footer from './footer';
import MobileMenu from './mobile-menu';
import Faq from './faq';
import About from './about';
import StartDialog from './start-dialog';
import LinkOut from './link-out';

import { Container, Grid } from '@mui/material';
import { Button, Typography, Link } from '@mui/material';

import NavigateNextIcon from '@mui/icons-material/NavigateNext';


export const STEP = {
  WAITING: 'WAITING',
  INPUT:  'INPUT',
  LOADING: 'LOADING',
  ERROR:   'ERROR',
};

export const menuDef = [
  { label: "FAQ",      href: '/#faq' },
  { label: "About",    href: '/#about' },
  { label: "Contact",  href: 'https://baderlab.org/', target: '_blank' }
];

const logosDef = [
  // { src: "/images/bader-lab-logo.svg", alt: "Bader Lab logo", href: "https://baderlab.org/" },
  { src: "/images/cytoscape-consortium-logo.svg", alt: "Cytoscape Consortium logo", href: "https://cytoscape.org/" },
  { src: "/images/ku-leuven-logo.svg", alt: "KU Leuven logo", href: "https://gbiomed.kuleuven.be/english/cme/index.htm" },
  { src: "/images/uoft-logo.svg", alt: "UofT logo", href: "https://www.utoronto.ca/" },
];

const isMobileWidth = (theme) => window.innerWidth <= theme.breakpoints.values.sm;
const isTabletWidth = (theme) => !isMobileWidth(theme) && window.innerWidth <= theme.breakpoints.values.md;

let requestID = null;
let cancelledRequests = [];

function showResults(id) {
  location.href = `/document/${id}`;
}

//==[ Content ]=======================================================================================================

const useContentStyles = makeStyles(theme => ({
  root: {
    alignContent: 'center',
    width: '100%',
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    border: '4px solid transparent',
    backgroundColor: theme.palette.background.paper,
  },
  main: {
    marginBottom: theme.spacing(6),
  },
  menu: {
    marginLeft: theme.spacing(5),
    textTransform: 'unset',
  },
  content: {
    maxHeight: 700,
    marginTop: theme.spacing(12),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(0, 4, 0, 4),
    textAlign: 'left',
    [theme.breakpoints.down('md')]: {
      marginTop: 0,
      marginBottom: 0,
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
  },
  contentWithRecentNetworks: {
    marginTop: 0,
  },
  tagline: {
    fontWeight: 800,
    fontSize: 'clamp(1.5rem, 0.75rem + 2.5vw, 2.5rem)',
    marginTop: theme.spacing(2),
    [theme.breakpoints.down('md')]: {
      marginTop: theme.spacing(1),
      textAlign: 'center',
    },
    [theme.breakpoints.down('sm')]: {
      marginTop: 0,
    },
  },
  description : {
    fontSize: '1rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(5),
    marginBottom: theme.spacing(5),
    [theme.breakpoints.down('sm')]: {
      fontSize: 'unset',
      textAlign: 'center',
      marginTop: theme.spacing(2.5),
      marginBottom: theme.spacing(2.5),
    },
  },
  heroSection: {
    width: '100%',
    [theme.breakpoints.down('md')]: {
      textAlign: 'center',
      alignItems: 'center',
    },
  },
  section: {
    width: '100%',
    padding: theme.spacing(10, 0, 10, 0),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(6, 0, 6, 0),
    },
  },
  alternateSection: {
    backgroundColor: theme.palette.background.default,
  },
  sectionContainer: {
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: '1.85rem',
    fontWeight: 'bold',
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.5rem',
    },
  },
  sectionDescription: {
    maxWidth: 768,
    marginBottom: theme.spacing(6),
    color: theme.palette.text.secondary,
    [theme.breakpoints.down('sm')]: {
      fontSize: 'unset',
    },
  },
}));

export function Content({ recentNetworksController }) {
  const classes = useContentStyles();
  const theme = useTheme();

  /** State */

  // the QueryController interacts with this component via an event bus
  const [ dataConfig ] = useState(() => new DataConfig());
  const [ bus ] = useState(() => new EventEmitter());
  const [ controller ] = useState(() => new QueryController(bus));
  const [ sampleFiles, setSampleFiles ] = useState({ sampleRankFiles: [], sampleExprFiles: [] });
  // state for component interaction
  const [ mobile, setMobile ] = useState(() => isMobileWidth(theme));
  const [ tablet, setTablet ] = useState(() => isTabletWidth(theme));
  const [ openMobileMenu, setOpenMobileMenu ] = useState(false);
  const [ showRecentNetworks, setShowRecentNetworks ] = useState(false);

  // This state must be kept as a single object because the eventbus callbacks run asyncronously, 
  // so this state must be updated atomically to avoid extra re-renders (which also cause errors).
  // Each of the onXXX callbacks below must call setJobState at most once.
  const [ jobState, setJobState ] = useState({
    step: STEP.WAITING,
    demo: null,
    errorMessages: null,
  });
  const updateJobState = (update) => setJobState(prev => ({ ...prev, ...update }));

  /** Effects */

  useEffect(() => {
    const initialize = async () => await dataConfig.load();
    initialize();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setMobile(isMobileWidth(theme));
      setTablet(isTabletWidth(theme));
      if (!isMobileWidth(theme) && !isTabletWidth(theme)) {
        setOpenMobileMenu(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    bus.on('loading', onLoading);
    bus.on('finished', onFinished);
    bus.on('error', onError);
    return () => bus.removeAllListeners();
  }, []);

  /** Callbacks and utility functions */

  const onOpenMobileMenu = () => setOpenMobileMenu(true);
  const onCloseMobileMenu = () => setOpenMobileMenu(false);

  const loadSampleNetwork = async (fileName, format) => {
    if (jobState.step == STEP.LOADING)
      return;
    const file = await controller.fetchSampleData(fileName);
    if (file) {
      await controller.upload([file], format);
    }
  };

  const onClickGetStarted = () => {
    if (jobState.step != STEP.LOADING) {
      setJobState({ step: STEP.INPUT });
    }
  };

  const onClickCreateDemo = () => {
    if (jobState.step != STEP.LOADING) {
      setJobState({ step: STEP.INPUT, demo: true });
    }
  };

  const onLoading = () => {
    updateJobState({ step: STEP.LOADING });
  };

  /**
   * fileFormat is a separate argument because its a ref in the StartDialog
   */
  const onSubmit = async ({ demo, assembly, genes, advancedOptions }) => {
    requestID = uuid.v4();
    updateJobState({ step: STEP.LOADING });

    if (demo) {
      await controller.createDemoNetwork(requestID);
      return;
    }

    try {
      const speciesNomenclature = speciesNomenclatureDef[assembly];
      await controller.submitQuery({ nomenclatureCode: speciesNomenclature.nomenclatureCode, genes, advancedOptions, requestID });
    } catch (error) {
      console.error('Error submitting query:', error);
      updateJobState({ step: STEP.ERROR, errorMessages: ['Unknown error, please try again later.'] });
    }
  };
 
  const onError = ({ errors, requestID }) => {
    if (cancelledRequests.includes(requestID)) {
      console.log(`Ignoring error from cancelled request: { requestID: ${requestID} }`);
      return;
    }
    setJobState({ step: STEP.ERROR, errorMessages: errors });
  };

  const onCancel = () => {
    if (requestID) {
      console.log(`Cancelling request: ${requestID}`);
      cancelledRequests.push(requestID);
    }
    setJobState({ step: STEP.WAITING });
  };

  const onFinished = ({ resultsID, requestID }) => {
    if (resultsID === 'blah') {
      onCancel();
      return;
    }
    if (requestID && cancelledRequests.includes(requestID)) {
      console.log(`Ignoring cancelled request: { resultsID: ${resultsID}, requestID: ${requestID} }`);
      return;
    }
    showResults(resultsID);
  };

  const onRecentNetworksRefresh = () => {
    recentNetworksController.getRecentNetworksLength(length => setShowRecentNetworks(length > 0));
  };

  /** Render Components */
  return (
    <div className={classNames({ [classes.root]: true })}>
      <Header
        menuDef={menuDef}
        showRecentNetworks={showRecentNetworks}
        mobile={mobile}
        tablet={tablet}
        onClickGetStarted={onClickGetStarted}
        onOpenMobileMenu={onOpenMobileMenu}
      />
      <Container maxWidth="lg" disableGutters className={classes.main}>
        <Grid container direction="column" justifyContent="center" alignItems="center">
          <Grid item className={classes.heroSection} xs={12}>
            <RecentNetworksList
              isMobile={mobile}
              recentNetworksController={recentNetworksController}
              onRefresh={onRecentNetworksRefresh}
            />
          </Grid>
          <Grid item>
            <Grid
              container
              className={clsx(classes.content, { [classes.contentWithRecentNetworks]: showRecentNetworks })}
              direction={mobile || tablet ? 'column' : 'row'}
              justifyContent="center"
              alignItems="center"
            >
              <Grid item xs={mobile || tablet ? 12 : 6}>
                <Grid container direction="column" justifyContent="center" alignItems={mobile || tablet ? 'center' : 'flex-start'}>
                  <Grid item>
                    <Typography variant="h1" className={classes.tagline}>Gene Regulatory Networks</Typography>
                  </Grid>
                  <Grid item>
                    <p className={classes.description}>
                      Identify regulons using motif and track discovery in a set of co&#8209;regulated genes.
                    </p>
                  </Grid>
                  <Grid item className={classes.heroSection}>
                    {mobile || tablet 
                      ? <Figure /> 
                      : <GetStartedSection mobile={mobile} tablet={tablet} onClickGetStarted={onClickGetStarted} onClickCreateDemo={onClickCreateDemo} />
                    }
                  </Grid>
                {(mobile || tablet) && (
                  <Grid item className={classes.heroSection}>
                    <GetStartedSection mobile={mobile} tablet={tablet} onClickGetStarted={onClickGetStarted} onClickCreateDemo={onClickCreateDemo} />
                  </Grid>
                )}
                </Grid>
              </Grid>
            {!mobile && !tablet && (
              <Grid item className={classes.heroSection} xs={6}>
                <Figure />
              </Grid>
            )}
            </Grid>
          </Grid>
        </Grid>
        <LogoBar mobile={mobile} />
      </Container>
      <section id="faq" className={clsx(classes.section, classes.alternateSection)} >
        <Container maxWidth="lg" className={classes.sectionContainer}>
          <Typography variant="h2" className={classes.sectionTitle}>Frequently asked questions</Typography>
          <Typography className={classes.sectionDescription}>
            If you have anything else you would like to ask, please <LinkOut href="https://baderlab.org/">reach out to us</LinkOut>.
          </Typography>
          <Faq />
        </Container>
      </section>
      <section id="about" className={classes.section}>
        <Container maxWidth="md" className={classes.sectionContainer}>
          <About />
        </Container>
      </section>
      <Footer mobile={mobile} tablet={tablet} />
      <MobileMenu menuDef={menuDef} open={openMobileMenu} onClose={onCloseMobileMenu} />
    {jobState.step !== STEP.WAITING && (
      <StartDialog
        step={jobState.step}
        dataConfig={dataConfig}
        isMobile={mobile}
        isTablet={tablet}
        isDemo={jobState.demo}
        errorMessages={jobState.errorMessages}
        onSubmit={onSubmit}
        onCancelled={onCancel}
      />
    )}
    </div>
  );
}
Content.propTypes = {
  recentNetworksController: PropTypes.instanceOf(RecentNetworksController).isRequired,
};

//==[ Figure ]========================================================================================================

const useFigureStyles = makeStyles(theme => ({
  figure: {
    maxWidth: '100%',
    maxHeight: 398,
    objectFit: 'contain',
    border: `4px solid ${theme.palette.divider}`,
    borderRadius: 8,
    boxShadow: '0 20px 25px -5px rgb(0, 0, 0, 0.1), 0 8px 10px -36px rgb(0, 0, 0, 0.1)',
    [theme.breakpoints.down('md')]: {
      marginBottom: theme.spacing(4),
    },
    [theme.breakpoints.down('sm')]: {
      maxWidth: '80%',
      maxHeight: 300,
    },
  },
}));

function Figure() {
  const classes = useFigureStyles();
  const theme = useTheme();
  const img = theme?.palette?.mode === 'dark' ? 'hero-figure-dark.png' : 'hero-figure-light.png';

  return <img src={`/images/${img}`} alt="figure" className={classes.figure} />;
}

//==[ LogoBar ]=======================================================================================================

const useLogoBarStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(12),
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(4),
    },
  },
}));

function LogoBar({ mobile }) {
  const classes = useLogoBarStyles();

  return (
    <Container variant="regular" className={classes.root}>
      <Grid>
        <Grid
          container
          direction={mobile ? 'column' : 'row'}
          alignItems="center"
          justifyContent="center"
          spacing={mobile ? 2 : 10}
          className={classes.logoBar}
        >
        {logosDef.map((logo, idx) =>
          <Grid item key={idx}>
            <Logo src={logo.src} alt={logo.alt} href={logo.href} />
          </Grid>
        )}
        </Grid>
      </Grid>
    </Container>
  );
}
LogoBar.propTypes = {
  mobile: PropTypes.bool,
};

//==[ Logo ]==========================================================================================================

const useLogoStyles = makeStyles(() => ({
  logo: {
    maxHeight: 48,
  },
}));

function Logo({ src, alt, href }) {
  const classes = useLogoStyles();
  
  return (
    <LinkOut href={href} underline="none">
      <img src={src} alt={alt} className={classes.logo} />  
    </LinkOut>
  );
}
Logo.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  href: PropTypes.string,
};

//==[ GetStartedSection ]=============================================================================================

const useGetStartedSectionStyles = makeStyles(() => ({
  button: {
    minHeight: 40,
  },
}));

function GetStartedSection({ mobile, tablet, onClickGetStarted, onClickCreateDemo }) {
  const classes = useGetStartedSectionStyles();

  return (
    <Grid
      container
      justifyContent={mobile || tablet ? 'center' : 'flex-start'}
      alignItems="center"
      spacing={3}
    >
      <Grid item>
        <Button
          variant="contained"
          color="primary"
          endIcon={<NavigateNextIcon />}
          className={classes.button}
          onClick={onClickGetStarted}
        >
          Get Started
        </Button>
      </Grid>
      <Grid item>
        <Link onClick={onClickCreateDemo}>View Demo Network</Link>
      </Grid>
      {/* <Grid item>
        <Button
          variant="text"
          color="primary"
          startIcon={<PlayCircleFilledIcon />}
        >
          Watch Demo
        </Button>
      </Grid> */}
    </Grid>
  );
}
GetStartedSection.propTypes = {
  mobile: PropTypes.bool,
  tablet: PropTypes.bool,
  onClickGetStarted: PropTypes.func,
  onClickCreateDemo: PropTypes.any
};

export default Content;