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
const IREGULON_USER_AGENT = (req) => `iRegulon/Web - ${req.headers['user-agent']}`;

const http = Express.Router();


/*
 * Endpoint to submit a job to the iRegulon service--returns the "jobID".
 */
http.post('/submitJob', async function(req, res, next) {
  try {
    const params = new URLSearchParams();
    Object.entries(req.body).forEach(([key, value]) => params.append(key, value));
    console.log('Submitting new job...', IREGULON_JOB_SERVICE_URL, params);

    const response = await fetch(IREGULON_JOB_SERVICE_URL, {
      method: 'POST',
      headers: { 'User-Agent': IREGULON_USER_AGENT(req) },
      body: params
    });
    console.log('Finished submitting job: ' + response.status);

    if (!response.ok) {
      const body = await response.text();
      const status = response.status;
      console.log('submitJob ERROR:', body);
      throw new CreateError({ step: 'submitJob', body, status });
    }

    const txt = await response.text();
    console.log('submitJob response text:', txt);
    const jobID = txt?.replace('jobID:', '').trim();

    console.log('submitJob RETURN:', jobID);

    res.json({ jobID }); // Return the job ID to the client
  } catch (err) {
      next(err);
  }
});

/*
 * Endpoint to check the status of a job.
 */
http.get('/checkStatus/:jobID', async function(req, res, next) {
  try {
    const jobID = req.params.jobID;
    const params = new URLSearchParams({ jobID });
    console.log('Checking status of job ' + jobID + '...', IREGULON_STATE_SERVICE_URL);

    const response = await fetch(IREGULON_STATE_SERVICE_URL, {
      method: 'POST',
      headers: {
        'User-Agent': IREGULON_USER_AGENT(req),
      },
      body: params
    });
    console.log('Finished checking status of job ' + jobID + ': ' + response.status);

    if (!response.ok) {
      const body = await response.text();
      const status = response.status;
      console.log('checkStatus ERROR:', body);
      throw new CreateError({ step: 'checkStatus', body, status });
    }

    let status = 'UNKNOWN';
    const txt = await response.text();
    console.log('checkStatus response text:', txt);
    const lines = txt.split('\n');

    for (const line of lines) {
      const entry = line.split('\t');
      
      if (entry.length === 2 && entry[0] === 'jobState:') {
        status = entry[1].toUpperCase();
        break;
      }
    }
    console.log('checkStatus RETURN for ' + jobID + ':', status);
    
    res.json({ jobID, status }); // Return the current status of the job to the client
  } catch (err) {
    next(err);
  }
});

/**
 * Endpoint to get the error message for a job.
 */
http.get('/getErrorMessage/:jobID', async function(req, res, next) {
  try {
    const jobID = req.params.jobID;
    const params = new URLSearchParams({ jobID });

    console.log('Fetching error message for job ' + jobID + '...', IREGULON_ERROR_SERVICE_URL);

    const response = await fetch(IREGULON_ERROR_SERVICE_URL, {
      method: 'POST',
      headers: {
        'User-Agent': IREGULON_USER_AGENT(req),
      },
      body: params
    });
    console.log('Finished fetching error message: ' + res.status);

    if (!response.ok) {
      const body = await response.text();
      const status = response.status;
      console.log('getErrorMessage ERROR:', body);
      throw new CreateError({ step: 'getErrorMessage', body, status });
    }

    let errorMessage = '';
    const txt = await response.text();
    console.log('getErrorMessage response text:', txt);
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
    console.log('getErrorMessage RETURN for ' + jobID + ':', errorMessage);

    res.json({ jobID, errorMessage });
  } catch (err) {
    next(err);
  }
});

/*
 * Endpoint to get the job result once completed, which is then saved in the DB.
 */
http.post('/', async function(req, res, next) {
  try {
    const jobID = req.body.jobID;
    const params = { jobID, ...req.body.params };
    console.log('Getting results for job ' + jobID + '...', params);

    const { text, results } = await fetchJobResults(jobID, params, req);

    const geneSymbols = params.genes.split(';').map(name => name.trim()).filter(name => name.length > 0);
    const genes = geneSymbols.map(name => ({ name }));
    console.log('Annotating genes for ' + jobID + '...', genes);
    annotateGenes(genes, results);

    const name = createDefaultNetworkName(params);
    console.log('Default network name for ' + jobID + ': ' + name);

    const resultsID = await Datastore.saveResults({ genes, results, text, name, params });
    console.log('Results saved for ' + jobID, resultsID);

    // Return the result of the job
    res.json({ jobID, resultsID });
  } catch (err) {
    next(err);
  }
});


async function fetchJobResults(jobID, queryParams, req) {
  console.log('Fetching results for job ' + jobID + '...', IREGULON_RESULTS_SERVICE_URL);

  const res = await fetch(IREGULON_RESULTS_SERVICE_URL, {
    method: 'POST',
    headers: {
      'User-Agent': IREGULON_USER_AGENT(req),
    },
    body: new URLSearchParams({ jobID })
  });
  console.log('Finished fetching results: ' + res.status);

  if (!res.ok) {
    const body = await res.text();
    const status = res.status;
    console.log('getErrorMessage ERROR:', body);
    throw new CreateError({ step: 'fetchJobResults', body, status });
  }

  const text = await res.text();
  const results = parseMotifsAndTracks(text, queryParams);
  console.log('fetchJobResults RETURN (text/results lengths) for ' + jobID + ':', text?.length, results?.length);

  return { text, results };
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
  /**
   * Custom error class for network creation errors.
   * @param {Object} details - Error details.
   * @param {string} details.step - The step where the error occurred.
   * @param {string} details.body - The response body of the error.
   * @param {number} details.status - The HTTP status code of the error.
   * @param {string} [details.message] - Optional custom error message.
   * @param {Error} [details.cause] - Optional cause of the error.
   */
  constructor(details) {
    const { message, cause } = details;
    super(message ? message : "Network Creation Error", { cause });
    this.details = details;
  }
}

export function createRouterErrorHandler(err, req, res, next) {
  if (err instanceof CreateError) {
    console.log(err);
    res
      .status(NETWORK_CREATE_ERROR_CODE)
      .send({ details: err.details });
  } else {
    next(err);
  }
}

export default http;