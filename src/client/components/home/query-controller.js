import EventEmitter from 'eventemitter3';
import { SENTRY } from '../../env';
import * as Sentry from "@sentry/browser";


export class QueryController {
  
  /**
   * Create an instance of the controller
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(bus) {
    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();
    this.jobs = new Map();
  }
  
  captureNondescriptiveErrorInSentry(errorMessage) {
    // TODO
    // if (SENTRY) {
    //   Sentry.captureException(new NondescriptiveHandledError(errorMessage));
    //   console.error('Reporting browser error to Sentry: ' + errorMessage);
    // }
  }

  async fetchSampleData(fileName) {
    const dataurl = `/sample-data/${fileName}`;
    const sdRes = await fetch(dataurl);
    
    if (!sdRes.ok) {
      this.bus.emit('error', { errors: ["Error loading sample network"] });
      this.captureNondescriptiveErrorInSentry('Error loading sample network');
      return;
    }
    
    const data = await sdRes.text();
    const file = new File([data], fileName, { type: 'text/plain' });
    return file;
  }

  async createDemoNetwork(requestID) {
    this.bus.emit('finished', { networkID: '7cea4157-341a-4fc6-b6c4-9c7ac5bcc8d4', requestID });
  }

  async submitQuery({ organism, genes, requestID }) {
    // 1. Submit the job
    const params = {
      jobName: 'iRegulon-Web_' + requestID,
      SpeciesNomenclature: organism.speciesNomenclature.nomenclatureCode,
      ...organism.defaultRankingParams,
      ...organism.defaultRecoveryParams,
      ...organism.defaultRegionBasedParams,
      ...organism.defaultTFPredictionParams,
      genes: genes.join(';'),
    };

    console.log('Submitting job with params:', params);

    const jobID = await this._submitJob(params, requestID);
          
    if (jobID && jobID.length > 0) {
      // 2. Check the job status
      let status;
      let i = 1;
      const myLoop = () => {
        setTimeout(async () => {
          console.log(`Checking state of job ${jobID} (attempt #${i})...`);
          status = await this._checkJobStatus(jobID);
          console.log(`- ${jobID}: ${status}`);
          i++;

          if (i < 50 && status !== 'FINISHED' && status !== 'ERROR') {
            myLoop();
          } else {
            // 3. Get the results
            if (status === 'FINISHED') {
              const networkID = await this._fetchJobResults(jobID);
              
              console.log('finished', { networkID, requestID });
              this.bus.emit('finished', { networkID, requestID });
            } else {
              // TODO handle error
            }
          } 
        }, 10000);
      };
      myLoop();
    } else {
      // TODO handle error
    }
  }

  async _submitJob(params) {
    const url = '/api/create/submitJob';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (res.ok) {
      const { jobID } = await res.json();
      console.log('New job submitted', jobID);
      this.jobs.set(jobID, { status: 'UNKNOWN', params });

      return jobID;
    } else {
      console.log(await res.text());
    }
  }

  async _checkJobStatus(jobID) {
    const url = `/api/create/checkStatus/${jobID}`;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
    });

    if (res.ok) {
      const { status } = await res.json();
      const job = this.jobs.get(jobID);
      job && (job.status = status);
      console.log(job);

      return status;
    } else {
      console.log(await res.text());
    }
  }

  async _fetchJobResults(jobID) {
    const url = '/api/create';
    const job = this.jobs.get(jobID);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobID, params: job.params })
    });

    if (res.ok) {
      const { networkID } = await res.json();
      console.log(networkID);
      return networkID;
    } else {
      console.log(await res.text());
    }
  }

  errorMessagesForCreateError(details) {
    // File format validation errors can be found in data-file-reader.js
    const { step, detail } = details;
    const errors = [];

    if(step === 'fgsea') {
      errors.push('Error running FGSEA service.', 'Please try again later.');
    } else if(step == 'em') {
      if(detail === 'empty') {
         // Probable causes: The gene IDs don't match whats in our pathway database or none of the enriched pathways passed the filter cutoff.
        errors.push('Not able to create a network from the provided data.');
        errors.push('There are not enough significantly enriched pathways.');
      } else {
        errors.push('Error running iRegulon service.', 'Please try again later.');
      }
    } else if(step == 'bridgedb') {
      errors.push('Error running BridgeDB service.', 'Could not map Ensembl gene IDs to HGNC.', 'Please try again later.');
    }

    return errors;
  }
}

class NondescriptiveHandledError extends Error { // since we don't have well-defined errors
  constructor(message) {
    message = message ?? 'A non-descriptive error occurred.  Check the attached file.';
    super(message);
  }
}