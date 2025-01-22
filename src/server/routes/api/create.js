import Express from 'express';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

import Datastore from '../../datastore.js';
import { createDefaultNetworkName } from '../../util.js';
import { annotateGenes, parseMotifsAndTracks } from '../../util.js';

import { 
  IREGULON_JOB_SERVICE_URL,
  IREGULON_STATE_SERVICE_URL,
  IREGULON_RESULTS_SERVICE_URL,
  IREGULON_ERROR_SERVICE_URL,
} from '../../env.js';


const NETWORK_CREATE_ERROR_CODE = 450;
const IREGULON_USER_AGENT = 'iRegulon/1.4 (build: 2024-08-06; Cytoscape: 3.11.0-SNAPSHOT; Mac OS X; 14.5; aarch64)';

const http = Express.Router();
const jobParams = new Map(); // jobID -> params


/*
 * Endpoint to submit a job to the iRegulon service--returns the "jobID".
 */
http.post('/submitJob', async function(req, res) {
  const params = new URLSearchParams();
  const savedParams = {};

  Object.entries(req.body).forEach(([key, value]) => {
    params.append(key, value);
    savedParams[key] = value;
  });

  const response = await fetch(IREGULON_JOB_SERVICE_URL, {
    method: 'POST',
    headers: { 'User-Agent': IREGULON_USER_AGENT },
    body: params
  });

  if (!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'submitJob', body, status });
  }

  const txt = await response.text();
  const jobID = txt?.replace('jobID:', '').trim();

  savedParams['jobID'] = jobID;
  savedParams['timestamp'] = new Date();
  jobParams.set(jobID, savedParams); // save the params for later, to store in mongo
 
  res.json({ jobID }); // Return the job ID to the client

  clearOldJobParams();
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
    jobParams.delete(jobID);
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
  
  res.json({ jobID, status }); // Return the current status of the job to the client
});

/**
 * Endpoint to get the error message for a job.
 */
http.get('/getErrorMessage/:jobID', async function(req, res) {
  const jobID = req.params.jobID;
  const params = new URLSearchParams({ jobID });

  console.log('Fetching error message for job ' + jobID + '...');

  const response = await fetch(IREGULON_ERROR_SERVICE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': IREGULON_USER_AGENT,
    },
    body: params
  });
  console.log('Finished fetching error message: ' + res.ok);

  if (!response.ok) {
    const body = await response.text();
    const status = response.status;
    throw new CreateError({ step: 'getErrorMessage', body, status });
  }

  let errorMessage = '';
  const txt = await response.text();
  const lines = txt.split('\n');

  for (const line of lines) {
    const entry = line.split('\t');
    
    if (entry.length === 2) {
      const key = entry[0].toUpperCase();
      
      if (key === 'JOB_ERROR:') {
        errorMessage = entry[1];
        break;
      } else if (key === 'ERROR:') {
        errorMessage = entry[1].replaceAll("\\\\n", " ");
        break;
      }
    }
  }

  res.json({ jobID, errorMessage });
});

/*
 * Endpoint to get the job result once completed, which is then saved in the DB.
 */
http.post('/', async function(req, res) {
  const jobID = req.body.jobID;
  const params = req.body.params;
  const savedParams = jobParams.get(jobID);

  console.log('Fetching results for job ' + jobID + '...', params);
  console.log(savedParams);
  const { text, results } = await fetchJobResults(jobID, savedParams);
                
  const geneSymbols = params.genes.split(';').map(name => name.trim()).filter(name => name.length > 0);
  const genes = geneSymbols.map(name => ({ name }));
  annotateGenes(genes, results);

  jobParams.delete(jobID);

  const name = createDefaultNetworkName(params);

  const networkID = await Datastore.saveResults({ genes, results, text, name, params: savedParams });
  console.log(networkID);

  // Return the result of the job
  res.json({ jobID, networkID });
});


async function fetchJobResults(jobID, savedParams) {
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

  const text = await res.text();
  const results = parseMotifsAndTracks(text, savedParams);

  return { text, results };
}

/**
 * Prevent a potential memory leak by clearing old jobs.
 */
function clearOldJobParams() {
  const maxAge = 1000 * 60 * 60 * 24; // 24 hours
  const now = new Date();
  let count = 0;
  for (const [jobID, params] of jobParams.entries()) {
    const timestamp = params.timestamp;
    if (now - timestamp > maxAge) {
      jobParams.delete(jobID);
      count++;
    }
  }
  if (count > 0) {
    console.log('Cleared ' + count + ' old job params.');
  }
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