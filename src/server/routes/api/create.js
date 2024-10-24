import Express from 'express';
import fs from 'fs/promises';
import * as Sentry from "@sentry/node";
import fetch from 'node-fetch';
import Datastore from '../../datastore.js';
import { annotateGenes, parseMotifsAndTracks } from '../../util.js';
import { rankedGeneListToDocument, fgseaServiceGeneRanksToDocument } from '../../datastore.js';
import { performance } from 'perf_hooks';
import { 
  IREGULON_JOB_SERVICE_URL,
  IREGULON_STATE_SERVICE_URL,
  IREGULON_RESULTS_SERVICE_URL,
  BRIDGEDB_URL,
  MONGO_URL,
} from '../../env.js';

const NETWORK_CREATE_ERROR_CODE = 450;
const IREGULON_USER_AGENT = 'iRegulon/1.4 (build: 2024-08-06; Cytoscape: 3.11.0-SNAPSHOT; Mac OS X; 14.5; aarch64)';

const http = Express.Router();


/*
 * Endpoint to submit a job to the iRegulon service--returns the "jobID".
 */
http.post('/submitJob', async function(req, res) {
  const params = new URLSearchParams();
  Object.entries(req.body).forEach(([key, value]) => params.append(key, value));

  const response = await fetch(IREGULON_JOB_SERVICE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': IREGULON_USER_AGENT,
    },
    body: params
  });

  if (!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'submitJob', body, status });
  }

  const txt = await response.text();
  const jobID = txt?.replace('jobID:', '').trim();

  // Return the job ID to the client
  res.json({ jobID });
});

/*
 * Endpoint to check the status of a job.
 */
http.get('/checkStatus/:jobID', async function(req, res) {
  const jobID = req.params.jobID;
  const params = new URLSearchParams({ jobID });

  const response = await fetch(IREGULON_STATE_SERVICE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': IREGULON_USER_AGENT,
    },
    body: params
  });

  if (!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'checkStatus', body, status });
  }

  let status = 'UNKNOWN';
  const txt = await response.text();
  const lines = txt.split('\n');

  for (const line of lines) {
    const entry = line.split('\t');
    
    if (entry.length === 2 && entry[0] === 'jobState:') {
      status = entry[1].toUpperCase();
      break;
    }
  }
  
  // Return the current status of the job
  res.json({ jobID, status });
});

/*
 * Endpoint to get the job result once completed, which is then saved in the DB.
 */
http.post('/', async function(req, res) {
  const jobID = req.body.jobID;
  const params = req.body.params;
  
  console.log('Fetching results for job ' + jobID + '...');
  const results = await fetchJobResults(jobID);
                
  const geneSymbols = params.genes.split(';').map(name => name.trim()).filter(name => name.length > 0);
  const genes = geneSymbols.map(name => ({ name }));
  annotateGenes(genes, results);

  const networkID = await Datastore.saveResults(genes, results);
  console.log(networkID);

  // Return the result of the job
  res.json({ jobID, networkID });
});

/*
 * Runs the FGSEA/EnrichmentMap algorithms, saves the 
 * created network, then returns its ID.
 */
http.post('/demo', async function(req, res, next) {
  const perf = createPeformanceHook();
  try {
    // const rankFile = './public/geneset-db/brca_hd_tep_ranks.rnk';
    // let data = await fs.readFile(rankFile, 'utf8');
    
    // const networkID = await runDataPipeline({
    //   demo: true,
    //   networkName: 'Demo Network',
    //   contentType: 'text/tab-separated-values',
    //   type: 'preranked',
    //   body: data,
    //   perf
    // });

    // res.send(networkID);
  } catch (err) {
    next(err);
  } finally {
    perf.dispose();
  }
});


async function fetchJobResults(jobID) {
  console.log('Fetching results for job ' + jobID + '...');

  const params = new URLSearchParams({ jobID });
  const res = await fetch(IREGULON_RESULTS_SERVICE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': IREGULON_USER_AGENT,
    },
    body: params
  });
  console.log('Finished fetching results: ' + res.ok);

  if (!res.ok) {
    const body = await res.text();
    const status = res.status;
    throw new CreateError({ step: 'fetchJobResults', body, status });
  }

  const txt = await res.text();

  return parseMotifsAndTracks(txt);
}

function createPeformanceHook() {
  const tag = Date.now();
  const markNames = [];
  return {
    startTime: new Date(),
    mark: name => {
      const markName = `${name}-${tag}`;
      console.log('  running ' + markName);
      performance.mark(markName);
      markNames.push(markName);
    },
    measure: ({ from, to }) => {
      const { duration } = performance.measure(from, `${from}-${tag}`, `${to}-${tag}`);
      return duration;
    },
    dispose: () => {
      markNames.forEach(m => performance.clearMarks(m));
    }
  };
}

// async function runDataPipeline({ networkName, contentType, type, classes, body, demo, perf }, res) {
//   console.log('/api/create/');
//   // n.b. no await so as to not block
//   saveUserUploadFileToS3(body, `${networkName}.csv`, contentType);

//   const preranked = type === 'preranked';

//   perf.mark('bridgedb');
//   const needIdMapping = isEnsembl(body);
//   if(needIdMapping) {
//     body = await runEnsemblToHGNCMapping(body, contentType);
//   }

//   perf.mark('fgsea');
//   let rankedGeneList;
//   let pathwaysForEM;
//   if(preranked) {
//     const fgseaRes = await runFGSEApreranked(body, contentType);
//     const { pathways, gmtFile } = fgseaRes;
//     if(gmtFile !== GMT_FILE) {
//       throw new CreateError({ step: 'fgsea', detail: 'gmt', message: `FGSEA: wrong GMT. Expected '${GMT_FILE}', got '${gmtFile}'.` });
//     }
//     const delim = contentType === 'text/csv' ? ',' : '\t';
//     rankedGeneList = rankedGeneListToDocument(body, delim);
//     pathwaysForEM = pathways;
//   } else {
//     // Messages from FGSEA are basically just warning about non-finite ranks
//     const fgseaRes = await runFGSEArnaseq(body, classes, contentType);
//     const { ranks, pathways, messages, gmtFile } = fgseaRes;
//     if(gmtFile !== GMT_FILE) {
//       throw new CreateError({ step: 'fgsea', detail: 'gmt', message: `FGSEA: wrong GMT. Expected '${GMT_FILE}', got '${gmtFile}'.` });
//     }
//     sendMessagesToSentry('fgsea', messages);
//     rankedGeneList = fgseaServiceGeneRanksToDocument(ranks);
//     pathwaysForEM = pathways;
//   }

//   perf.mark('em');
//   const networkJson = await runEM(pathwaysForEM, demo);
//   if(isEmptyNetwork(networkJson)) {
//     throw new CreateError({ step: 'em', detail: 'empty' });
//   }
//   if(networkJson.gmtFile !== GMT_FILE) {
//     throw new CreateError({ step: 'em', detail: 'gmt', message: `EM-Service: wrong GMT. Expected '${GMT_FILE}', got '${networkJson.gmtFile}'.` });
//   }

//   let networkID;
//   try {
//     perf.mark('mongo');
//     networkID = await Datastore.createNetwork(networkJson, networkName, type, GMT_FILE, demo);
//     await Datastore.initializeGeneRanks(GMT_FILE, networkID, rankedGeneList);
//     res?.send(networkID);
//   } catch(e) {
//     throw new CreateError({ step: 'mongo', cause: e });
//   }
//
//   perf.mark('end');
//
//   Datastore.createPerfDocument(networkID, {
//     startTime: perf.startTime,
//     emptyNetwork: typeof networkID === 'undefined',
//     geneCount: rankedGeneList?.genes?.length,
//     steps: [ {
//       step: 'bridgedb',
//       needIdMapping,
//       url: BRIDGEDB_URL,
//       timeTaken: perf.measure({ from:'bridgedb', to:'fgsea' }),
//     }, {
//       step: 'fgsea',
//       type,
//       url: preranked ? FGSEA_PRERANKED_SERVICE_URL : FGSEA_RNASEQ_SERVICE_URL,
//       timeTaken: perf.measure({ from:'fgsea', to:'em' }),
//     }, {
//       step: 'em',
//       url: EM_SERVICE_URL,
//       timeTaken: perf.measure({ from:'em', to:'mongo' }),
//     }, {
//       step: 'mongo',
//       url: MONGO_URL,
//       timeTaken: perf.measure({ from:'mongo', to:'end' }),
//     }]
//   });
  
//   return networkID;
// }


function isEmptyNetwork(networkJson) {
  return !(networkJson.network?.elements?.nodes?.length) 
      || !(networkJson.summaryNetwork?.elements?.nodes?.length);
}


// async function runFGSEApreranked(ranksData, contentType) {
//   let response;
//   try {
//     response = await fetch(FGSEA_PRERANKED_SERVICE_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': contentType },
//       body: ranksData
//     });
//   } catch(e) {
//     throw new CreateError({ step: 'fgsea', type: 'preranked', cause: e });
//   }
//   if(!response.ok) {
//     const body = await response.text();
//     const status = response.status;
//     throw new CreateError({ step: 'fgsea', type: 'preranked', body, status });
//   }
//   return await response.json();
// }


// async function runFGSEArnaseq(countsData, classes, contentType) {
//   const url = FGSEA_RNASEQ_SERVICE_URL + '?' + new URLSearchParams({ classes });
//   let response;
//   try {
//     response = await fetch(url, {
//       method: 'POST',
//       headers: { 'Content-Type': contentType },
//       body: countsData
//     });
//   } catch(e) {
//     throw new CreateError({ step: 'fgsea', type: 'rnaseq', cause: e });
//   }
//   if(!response.ok) {
//     const body = await response.text();
//     const status = response.status;
//     throw new CreateError({ step: 'fgsea', type: 'rnaseq', body, status });
//   }
//   return await response.json();
// }


// async function runEM(fgseaResults, demo) {
//   const body = {
//     // We only support one dataSet
//     dataSets: [{
//       name: "EM Web",
//       method: "FGSEA",
//       fgseaResults
//     }],
//     parameters: {
//       // These parameters correspond to the fields in EMCreationParametersDTO
//       // similarityMetric: "JACCARD", 
//       // similarityCutoff: 0.25,

//       // parameters only used by the demo network
//       ...(demo && { 
//         qvalue: 0.0001,
//         similarityMetric: "JACCARD", 
//         similarityCutoff: 0.5,
//       })
//     }
//   };

//   let response;
//   try {
//     response = await fetch(EM_SERVICE_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(body)
//     });
//   } catch(e) {
//     throw new CreateError({ step: 'em', cause: e });
//   }
//   if(!response.ok) {
//     const body = await response.text();
//     const status = response.status;
//     throw new CreateError({ step: 'em', body, status });
//   }
//   return await response.json();
// }


/**
 * If the first gene is an ensembl ID then assume they all are.
 */
function isEnsembl(body) {
  const secondLine = body.split('\n', 2)[1]; // First line is the header row, skip it
  return secondLine && secondLine.startsWith('ENS');
}


/**
 * Sends a POST request to the BridgeDB xrefsBatch endpoint.
 * https://www.bridgedb.org/swagger/
 */
async function runBridgeDB(ensemblIDs, species='Human', sourceType='En') {
  // Note the 'dataSource' query parameter seems to have no effect.
  const url = `${BRIDGEDB_URL}/${species}/xrefsBatch/${sourceType}`;
  const body = ensemblIDs.join('\n');

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' }, // thats what it wants
      body
    });
  } catch(e) {
    throw new CreateError({ step: 'bridgedb', cause: e });
  }
  if(!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'bridgedb', body, status });
  }

  const responseBody = await response.text();

  // Parse response to get symbol names
  const hgncIDs = responseBody
    .split('\n')
    .map(line => {
      const symbol = line.split(',').filter(m => m.startsWith('H:'))[0];
      return symbol && symbol.slice(2); // remove 'H:'
    });
    
  return hgncIDs;
}


async function runEnsemblToHGNCMapping(body, contentType) {
  // Convert CSV/TSV to a 2D array 
  const lines = body.split('\n');
  const header  = lines[0];
  const delim = contentType === 'text/csv' ? ',' : '\t';

  const content = lines
    .slice(1)
    .filter(line => line && line.length > 0)
    .map(line => line.split(delim));

  const removeVersionCode = (ensID) => {
    const i = ensID.indexOf('.');
    if(i > 0) {
      return ensID.slice(0, i);
    }
    return ensID;
  };

  // Call BridgeDB
  const ensemblIDs = content.map(row => row[0]).map(removeVersionCode);

  const hgncIDs = await runBridgeDB(ensemblIDs);

  // Replace old IDs with the new ones
  const newContent = [];
  const invalidIDs = [];
  for(var i = 0; i < content.length; i++) {
    const row = content[i];
    const newID = hgncIDs[i];
    if(newID) {
      newContent.push([newID, ...row.slice(1)]);
    } else {
      invalidIDs.push(row[0]);
    }
  }

  if(invalidIDs.length > 0) {
    console.log("Sending id-mapping warning to Sentry. Number of invalid IDs: " + invalidIDs.length);
    sendMessagesToSentry('bridgedb', [{
      level: 'warning',
      type: 'ids_not_mapped',
      text: 'IDs not mapped',
      data: {
        'Total IDs Mapped': ensemblIDs.length, 
        'Invalid ID Count': invalidIDs.length,
        'Invalid IDs (First 100)': invalidIDs.slice(0, 100),
       }
    }]);
  } 

  // Convert back to a big string
  const newBody = header + '\n' + newContent.map(line => line.join(delim)).join('\n');
  return newBody;
}


function sendMessagesToSentry(service, messages) {
  if(!messages || messages.length == 0)
    return;

  for(const message of messages) {
    const { level, type, text, data } = message;
    
    // https://docs.sentry.io/platforms/node/usage/set-level/
    const event = {
      level,
      tags: { message_type:type, service },
      message: "Service Message: " + text,
      extra: data,
    };

    // This method is actually asynchronous
    // https://github.com/getsentry/sentry-javascript/issues/2049
    Sentry.captureEvent(event);
  }
}



class CreateError extends Error {
  constructor(details) {
    const { message, cause } = details;
    super(message ? message : "Network Creation Error", { cause });
    this.details = details;
  }  
}

export function createRouterErrorHandler(err, req, res, next) {
  if(err instanceof CreateError) {
    console.log(err);
    res
      .status(NETWORK_CREATE_ERROR_CODE)
      .send({ details: err.details });
  } else {
    next(err);
  }
}


export default http;