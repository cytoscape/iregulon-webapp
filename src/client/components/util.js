import { token } from 'morgan';

const USE_SMOOTH_LINK_SCROLLING = true;

const MC_V3_V6_LOGO_DIR = '/images/logos/mc_v3_v6';
const MC_V7_AND_HIGHER_LOGO_DIR = '/images/logos/mc_v7_and_higher';

const motifTrackDBs = [
  // MOTIFs:
  {
    db: 'C2H2-ZFs',
    prefix: 'c2h2_zfs__',
  },
  {
    db: 'CIS-BP',
    prefix: 'cisbp__',
  },
  {
    db: 'DBcorrDB',
    prefix: 'dbcorrdb__',
  },
  {
    db: 'Elemento',
    prefix: 'elemento__',
  },
  {
    db: 'FactorBook',
    prefix: 'factorbook__',
    url: (name) => `https://www.factorbook.org/tf/human/${name.replace('jaspar__', '')}/`,
  },
  {
    db: 'FANTOM',
    prefix: 'fantom__',
  },
  {
    db: 'FlyFactorSurvey',
    prefix: 'flyfactorsurvey__',
  },
  {
    db: 'hDPI',
    prefix: 'hdpi__',
  },
  {
    db: 'HOCOMOCO 10',
    prefix: 'hocomoco_',
    token: '.H10MO.',
    url: (name) => `http://hocomoco10.autosome.ru/motif/${name.replace('hocomoco__', '')}/`,
  },
  {
    db: 'HOCOMOCO 11',
    prefix: 'hocomoco_',
    token: '.H11MO.',
    url: (name) => `http://hocomoco11.autosome.ru/motif/${name.replace('hocomoco__', '')}/`,
  },
  {
    db: 'HOMER',
    prefix: 'homer__',
  },
  {
    db: 'iDMMPMM',
    prefix: 'idmmpmm__',
  },
  {
    db: 'JASPAR',
    prefix: 'jaspar__',
    url: (name) => `http://jaspar.genereg.net/matrix/${name.replace('jaspar__', '')}/`,
  },
  {
    db: 'PreDREM',
    prefix: 'predrem__',
  },
  {
    db: 'ScerTF',
    prefix: 'scertf__',
  },
  {
    db: 'SwissRegulon',
    prefix: 'swissregulon__',
    url: (name) => {
      if (name.startsWith('swissregulon__hs__') || name.startsWith('swissregulon__mm__')) {
        const org = name.startsWith('swissregulon__hs__') ? 'hg18' : 'mm9';
        name = name.replace('swissregulon__', '').replace('hs__', '').replace('mm__', '');
        name = name.replace(/_/g, '%2C');
        return `http://swissregulon.unibas.ch/wm/?wm=${name}&org=${org}`;
      }
      return null;
    },
  },
  {
    db: 'Taipale',
    prefix: 'taipale__',
  },
  {
    db: 'Taipale Cyt Meth',
    prefix: 'taipale_cyt_meth__',
  },
  {
    db: 'Taipale TF pairs',
    prefix: 'taipale_tf_pairs__',
  },
  {
    db: 'TF dimers',
    prefix: 'tfdimers__',
  },
  {
    db: 'Transfac Pro',
    prefix: 'transfac_pro__',
    url: (name) => {
      name = name.replace('transfac_pro__', '');
      return `https://portal.genexplain.com/cgi-bin/build_t/idb/1.0/get.cgi?${name}`;
    },
  },
  {
    db: 'Transfac Public',
    prefix: 'transfac_public__',
    url: (name) => {
      name = name.replace('transfac_public__', '');
      return `https://portal.genexplain.com/cgi-bin/build_t/idb/1.0/get.cgi?${name}`;
    },
  },
  {
    db: 'Transfac Public',
    prefix: 'transfac_public__',
    url: (name) => {
      name = name.replace('transfac_public__', '');
      return `https://portal.genexplain.com/cgi-bin/build_t/idb/1.0/get.cgi?${name}`;
    },
  },
  {
    db: 'YeTFaSCo',
    prefix: 'yetfasco__',
  },
  // TRACKs:
  {
    db: 'ENCODE',
    prefix: 'ENCFF',
    url: (name) => `https://www.encodeproject.org/experiments/${name}/`,
  },
];


export function motifTrackLinkOut(nameWithCollection) {
  for (const { db, prefix, token, url } of motifTrackDBs) {
    if (nameWithCollection.startsWith(prefix)) {
      if (token) {
        if (nameWithCollection.includes(token)) {
          return { db, href: url?.(nameWithCollection) };
        }
      } else {
        return { db, href: url?.(nameWithCollection) };
      }
    }
  }

  return { db: dbName(nameWithCollection) };
}

export function dbName(nameWithCollection) {
  for (const { db, prefix, token } of motifTrackDBs) {
    if (nameWithCollection.startsWith(prefix)) {
      if (token) {
        if (nameWithCollection.includes(token)) {
          return db;
        }
      } else {
        return db;
      }
    }
  }

  const tokens = nameWithCollection.split('__');
  let db = token.length > 1 ? tokens[0] : null;
  if (db && db.length > 0) {
    db = db.charAt(0).toUpperCase() + db.slice(1);
  }

  return db;
}

export function motifName(nameWithCollection) {
  const couldBe7OrHigherIndex = nameWithCollection.indexOf("__");
  const couldBe3To6Index = nameWithCollection.indexOf("-");

  if (couldBe7OrHigherIndex !== -1) {
    if (couldBe3To6Index !== -1) {
      if (couldBe7OrHigherIndex < couldBe3To6Index) {
        return nameWithCollection.substring(couldBe7OrHigherIndex + 2);
      } else {
        return nameWithCollection.substring(couldBe3To6Index + 1);
      }
    } else {
      return nameWithCollection.substring(couldBe7OrHigherIndex + 2);
    }
  } else {
    return nameWithCollection.substring(couldBe3To6Index + 1);
  }
}

export function logoPath(motifName) {
  const motifNameMotifCollectionCouldBe7OrHigherIndex = motifName.indexOf("__");
  const motifNameMotifCollectionCouldBe3To6Index = motifName.indexOf("-");

  if (motifNameMotifCollectionCouldBe7OrHigherIndex !== -1) {
    if (motifNameMotifCollectionCouldBe3To6Index !== -1) {
      if (motifNameMotifCollectionCouldBe7OrHigherIndex < motifNameMotifCollectionCouldBe3To6Index) {
        return `${MC_V7_AND_HIGHER_LOGO_DIR}/${motifName}.png`;
      } else {
        return `${MC_V3_V6_LOGO_DIR}/${motifName}.png`;
      }
    } else {
      return `${MC_V7_AND_HIGHER_LOGO_DIR}/${motifName}.png`;
    }
  } else {
    return `${MC_V3_V6_LOGO_DIR}/${motifName}.png`;
  }
}

/**
 * @param {*} type 'MOTIF', 'TRACK', or 'CLUSTER'
 * @param {*} typeId the 'clusterCode' or 'rank' value, which must be unique for the type.
 * @returns the row ID which is unique for all tables/types.
 */
export function rowId(type, typeId) {
  return `${type.toUpperCase()}-${typeId}`;
}

/**
 * @param {*} type 'MOTIF', 'TRACK', or 'CLUSTER'
 * @returns 'clusterCode' for 'CLUSTER' and 'rank' for the rest.
 */
export function rowTypeIdField(type) {
  return type === 'CLUSTER' ? 'clusterCode' : 'rank';
}


export function isMobile(theme) {
  return window.innerWidth < theme.breakpoints.values.sm;
}

export function isTablet(theme) {
  return window.innerWidth < theme.breakpoints.values.md;
}

export function delay(millis) {
  return new Promise(r => setTimeout(r, millis, 'delay'));
}

export function stringToBlob(str) {
  return new Blob([str], { type: 'text/plain;charset=utf-8' });
}

export function networkURL(id) {
  return `${window.location.origin}/document/${id}`;
}


export function openPageLink(href, target) {
  if (target === '_blank') {
    window.open(href);
  } else if (href.indexOf("#") >= 0 && USE_SMOOTH_LINK_SCROLLING) {
    // get hash portion of url
    const hash = href.split("#")[1];

    document.getElementById(hash).scrollIntoView({
        behavior: 'smooth'
    });

    let isScrolling;

    // Listen for scroll events
    const lis = function() {
      // Clear the timeout if it was already set
      window.clearTimeout(isScrolling);

      // Set a timeout to run after scrolling ends
      isScrolling = setTimeout(function() {
        // Remove passive listener
        window.removeEventListener('scroll', lis);

        // Update the URL when scrolling has stopped
        window.location.href = href;
      }, 150); // delay after scrolling ends
    };

    window.addEventListener('scroll', lis, { passive: true });
  } else {
    window.location.href = href;
  }
}