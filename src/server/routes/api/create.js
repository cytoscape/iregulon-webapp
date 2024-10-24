import Express from 'express';
import * as Sentry from "@sentry/node";
import fetch from 'node-fetch';
import Datastore from '../../datastore.js';
import { annotateGenes, parseMotifsAndTracks } from '../../util.js';
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
 * Submit a job to the iRegulon service, then returns the jobID.
 */
http.post('/', async function(req, res, next) {
  const perf = createPeformanceHook();

  try {
    // 1. Submit the job
    const params = new URLSearchParams();
    Object.entries(req.body).forEach(([key, value]) => params.append(key, value));

    const jobID = await submitJob(params, perf);

    if (jobID && jobID.length > 0) {
      // 2. Check the job status
      let state;
      let i = 1;
      const myLoop = () => {
        setTimeout(async () => {
          console.log(`Checking state of job ${jobID} (attempt #${i})...`);
          state = await checkJobState(jobID);
          console.log(`- ${jobID}: ${state}`);
          i++;

          if (i < 50 && state !== 'FINISHED' && state !== 'ERROR') {
            myLoop();
          } else {
             // 3. Get the results
            if (state === 'FINISHED') {
              try {
                const results = await fetchJobResults(jobID, perf);
                
                perf.mark('genes');

                const geneSymbols = req.body.genes.split(';').map(name => name.trim()).filter(name => name.length > 0);
                const genes = geneSymbols.map(name => ({ name }));
                annotateGenes(genes, results);

                perf.mark('mongo');

                const name = null; // TODO, what should be the default name?
                const id = await Datastore.saveResults(genes, results, name);

                perf.mark('end');

                console.log(id);
                res?.send(id);
              } finally {
                console.log('[ DONE ] Elapsed Time:', perf.measure({ from: 'submit', to: 'genes' }));
                perf.dispose();
              }
            } else {
              perf.dispose();
              // TODO handle error
            }
          } 
        }, 10_000);
      };
      myLoop();
    }
  } catch (err) {
    next(err);
  }
});

/*
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

async function submitJob(params, perf) {
  perf.mark('submit');

  const res = await fetch(IREGULON_JOB_SERVICE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': IREGULON_USER_AGENT,
    },
    body: params
  });

  if (!res.ok) {
    const body = await res.text();
    const status = res.status;
    throw new CreateError({ step: 'submitJob', body, status });
  }

  const txt = await res.text();
  const jobID = txt?.replace('jobID:', '').trim();

  return jobID;
}

async function checkJobState(jobID) {
  const params = new URLSearchParams({ jobID });
  const res = await fetch(IREGULON_STATE_SERVICE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': IREGULON_USER_AGENT,
    },
    body: params
  });

  if (!res.ok) {
    const body = await res.text();
    const status = res.status;
    throw new CreateError({ step: 'checkJobState', body, status });
  }

  const txt = await res.text();
  const lines = txt.split('\n');

  for (const line of lines) {
    const entry = line.split('\t');
    
    if (entry.length === 2 && entry[0] === 'jobState:') {
      return entry[1].toUpperCase();
    }
  }
  
  return 'UNKNOWN';
}

async function fetchJobResults(jobID, perf) {
  console.log('Fetching results for job ' + jobID + '...');
  perf.mark('results');

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