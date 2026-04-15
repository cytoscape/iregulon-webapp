import EventEmitter from 'eventemitter3';


export class QueryController {
  
  /**
   * Create an instance of the controller
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(bus) {
    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();
    this.jobs = new Map();
    this.requestToJobIDs = new Map(); // Map to keep track of which jobID belongs to which requestID
    this.cancelledJobs = new Set();
  }
  
  async createDemoNetwork(requestID) {
    this.bus.emit('finished', { resultsID: '7cea4157-341a-4fc6-b6c4-9c7ac5bcc8d4', requestID });
  }

  async submitQuery({ nomenclatureCode, genes, advancedOptions, requestID }) {
    // 1. Submit the job
    const params = {
      jobName: 'iRegulon-Web_' + requestID,
      SpeciesNomenclature: nomenclatureCode,
      genes: genes.join(';'),
      ...advancedOptions,
    };

    console.log('Submitting job with params:', params);

    const jobID = await this._submitJob(params, requestID);
    
    if (jobID && jobID.length > 0) {
      this.requestToJobIDs.set(requestID, jobID);
      
      // 2. Check the job status
      let status;
      let i = 1;

      const myLoop = () => {
        setTimeout(async () => {
          console.log(`Checking state of job ${jobID} (attempt #${i})...`);
          status = await this._checkJobStatus(jobID);
          console.log(`- ${jobID}: ${status}`);
          i++;

          if (this.cancelledJobs.has(jobID)) {
            console.log(`Job ${jobID} has been cancelled. Stopping status checks.`);
            this.cancelledJobs.delete(jobID);
            this.requestToJobIDs.delete(requestID);
            return;
          } else if (i < 50 && status !== 'FINISHED' && status !== 'ERROR') {
            myLoop();
          } else {
            // 3. Get the results or handle the error
            if (status === 'FINISHED') {
              const resultsID = await this._fetchJobResults(jobID);
              
              console.log('finished', { resultsID, requestID });
              this.bus.emit('finished', { resultsID, requestID });
            } else if (status === 'ERROR') {
              const errorMessage = await this._fetchErrorMessage(jobID);
              console.log('error', { requestID, errorMessage });
              this.bus.emit('error', { requestID, errors: [errorMessage] });
            }
          } 
        }, 10000);
      };

      myLoop();
    } else {
      console.log('error', { requestID, errorMessage: 'No jobID returned from iRegulon' });
      this.bus.emit('error', { requestID, errors: ['Unknown error. Please try again later.'] });
    }
  }

  cancelRequest(requestID) {
    if (requestID) {
      const jobID = this.requestToJobIDs.get(requestID);
      if (jobID) {
        this.cancelledJobs.add(jobID);
      }
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
      const { resultsID } = await res.json();
      console.log(resultsID);
      return resultsID;
    } else {
      console.log(await res.text());
    }
  }

  async _fetchErrorMessage(jobID) {
    const url = `/api/create/getErrorMessage/${jobID}`;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
    });

    if (res.ok) {
      const { errorMessage } = await res.json();
      
      return errorMessage?.replace(/\\n/g, '\n'); // iRegulon sends '\\n' instead of '\n'
    } else {
      console.log(await res.text());
    }
  } 
}