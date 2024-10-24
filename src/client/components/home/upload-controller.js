import EventEmitter from 'eventemitter3';
import { SENTRY } from '../../env';
import * as Sentry from "@sentry/browser";
import { replace } from 'lodash';

export const RNA_SEQ = 'rnaseq';
export const PRE_RANKED = 'ranks';


export class UploadController {
  
  /**
   * Create an instance of the controller
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(bus) {

    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();
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

    // this.bus.emit('loading', true);

    // const res = await fetch('/api/create/demo', {
    //   method: 'POST',
    // });

    // if (res.ok) {
    //   const networkID = await res.text();
    //   this.bus.emit('finished', { networkID, requestID });
    //   return networkID;
    // } else if (res.status == 450) {
    //   // custom status code, error while running create data pipeline
    //   const body = await res.json();
    //   const errors = this.errorMessagesForCreateError(body.details);
    //   this.bus.emit('error', { errors, requestID });
    // } else {
    //   this.bus.emit('error', { errors: ['could not create demo network'], requestID });
    // }
  }

  // async upload(files, format) {
  //   const file = files && files.length > 0 ? files[0] : null;
  //   if (!file)
  //     return;

  //   this.bus.emit('loading', true);
    
  //   const name = file.name.replace(FILE_EXT_REGEX, '');
  //   const ext  = file.name.split('.').pop().toLowerCase();

  //   if (SENTRY) {
  //     const attachmentName = file.name;
  //     const attachmentContentType = file.type;
  //     const arrayBuffer = await file.arrayBuffer();
  //     const attachmentData = new Uint8Array(arrayBuffer);

  //     Sentry.configureScope(scope => {
  //       scope.clearAttachments();
  //       scope.addAttachment({ filename: attachmentName, data: attachmentData, contentType: attachmentContentType });
  //     });
  //   }

  //   try {
  //     let readFile;
  //     if(TSV_EXTS.includes(ext)) {
  //       readFile = readTextFile;
  //     } else if(EXCEL_EXTS.includes(ext)) {
  //       readFile = readExcelFile;
  //     } else {
  //       const exts = TSV_EXTS.join(', ') + ', ' + EXCEL_EXTS.join(', ');
  //       this.bus.emit('error', { errors: [`File extension not supported. Must be one of: ${exts}`] });
  //       return;
  //     }

  //     const fileInfo = await readFile(file);
  //     fileInfo.fileName = file.name;
  //     fileInfo.networkName = name;
  //     if(format) {
  //       fileInfo.format = format;
  //     }
  //     console.log('File uploaded', fileInfo);

  //     // Check if there's errors when uploading the file.
  //     const { errors } = fileInfo;
  //     if(errors && errors.length > 0) {
  //       this.bus.emit('error', { errors });
  //     } else {
  //       this.bus.emit('fileUploaded', fileInfo);
  //     }
  //   } catch (e) {
  //     console.log(e);
  //     this.bus.emit('error', { errors: ['Internal Error'] });
  //     this.captureNondescriptiveErrorInSentry('Some error in handling uploaded file:' + e.message);
  //     return;
  //   }
  // }
  
  async submitJob({ organism, genes, requestID }) {
    const res = await this._submitJobToService(organism, genes, requestID);
          
    if (res.errors) {
      this.bus.emit('error', { errors: res.errors, requestID });
      // TODO: Is this necessary? Errors on the server should get logged by the server, right?
      this.captureNondescriptiveErrorInSentry('Error in iRegulon service with input data'); 
      return;
    }

    console.log('finished', { networkID: res.netID, requestID });
    this.bus.emit('finished', { networkID: res.netID, requestID });
  }

  async _submitJobToService(organism, genes, requestID) {
    const url = '/api/create';
    const params = {
      // == TODO: Create advanced options for the user to set these values ==
      jobName: 'iRegulon-Web_' + requestID,
      AUCThreshold: 0.03,
      rankThreshold: 5000,
      NESThreshold: 3.0,
      minOrthologous: 0.0,
      maxMotifSimilarityFDR: 0.001,
      selectedMotifRankingsDatabase: 'hg38__refseq-r80__10kb_up_and_down_tss__mc_v9',
      selectedTrackRankingsDatabase: 'hg38__refseq-r80__10kb_up_and_down_tss__tc_v1',
      // == END ==
      SpeciesNomenclature: organism.nomenclatureCode,
      genes: genes.join(';'),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (res.ok) {
      const jobID = await res.text();
      console.log(jobID);
      return { netID: jobID };
    } else {
      console.log(await res.text());
      return { errors: [] }; // empty array shows generic error message
    }
    // else if (res.status == 413) {
    //   // Max file size for uploads is defined in the dataParser in the server/routes/api/index.js file.
    //   return { errors: ["The uploaded file is too large. The maximum file size is 50 MB."] };
    // } else if (res.status == 450) {
    //   // custom status code, error while running create data pipeline
    //   const body = await res.json();
    //   const errors = this.errorMessagesForCreateError(body.details);
    //   return { errors };
    // } else {
    //   return { errors: [] }; // empty array shows generic error message
    // }
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