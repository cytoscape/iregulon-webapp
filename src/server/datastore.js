import { MongoClient } from 'mongodb';
import uuid from 'uuid';
import MUUID from 'uuid-mongodb';
import _ from 'lodash';
import fs from 'fs';
import { parseMotifsAndTracks, annotateGenes } from './util.js';


// This is the promary collection, each document represents the results 
// of an analysis returned by the iregulon service. Documens in this collection
// are created once and are (mostly) static.
const MOTIFS_AND_TRACKS_COLLECTION = 'motifsAndTracks'; 

// This collection contains state data that is associated with a document in the 
// motifsAndTracks collection. It contains mutable state data like the name
// of the document and UI state (like whats selected in the data table).
const STATE_DATA_COLLECTION = 'stateData';

// const PERFORMANCE_COLLECTION = 'performance';

export const DEMO_ID = '7cea4157-341a-4fc6-b6c4-9c7ac5bcc8d4';


/**
 * When called with no args will returns a new unique mongo ID.
 * When called with a UUID string arg will convert it to a mongo compatible ID.
 * Throws an exception if called with an invalid string arg.
 */
function makeID(strOrObj) {
  if(_.has(strOrObj, 'bson')) {
    return strOrObj;
  }
  const string = _.isString(strOrObj) ? strOrObj : uuid.v4();
  const bson = MUUID.from(string);
  return { string, bson };
}


class Datastore {
  // mongo; // mongo connection obj
  // db; // app db

  constructor() { }

  async initialize() {
    await this.connect();
    await this.createIndexes();
    await this.loadDemo();
  }

  async connect() {
    console.info('Connecting to MongoDB');
    const { MONGO_URL, MONGO_ROOT_NAME } = process.env;
    this.mongo = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    this.db = this.mongo.db(MONGO_ROOT_NAME);
    console.info('Connected to MongoDB');
  }

  async loadDemo() {
    if (await this.idExists(DEMO_ID)) {
      console.log("- Demo Results Already Loaded");
      return;
    }

    // Load demo file (public/sample-data/hypoxia_geneset-results.tsv) into cache
    const readFile = (path, encoding) => {
      return new Promise((resolve, reject) => {
        fs.readFile(path, encoding, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    };

    try {
      // Load the demo parameters (json)
      const paramsData = await readFile('public/sample-data/hypoxia_geneset-params.json', 'utf8');
      const params = JSON.parse(paramsData);
      console.log("- Demo Parameters Loaded:", params);

      const resultsData = await readFile('public/sample-data/hypoxia_geneset-results.tsv', 'utf8');
      const results = parseMotifsAndTracks(resultsData, params);
      console.log("- Demo Results Loaded:", results.length);

      const geneData = params.genes;
      const geneSymbols = geneData.split(';').map(name => name.trim()).filter(name => name.length > 0);
      const genes = geneSymbols.map(name => ({ name }));
      annotateGenes(genes, results);
      console.log("- Demo Genes Loaded:", genes.length);

      await this.saveResults({
        genes,
        results,
        text: resultsData,
        name: "Demo Network",
        params,
        demoID: DEMO_ID
      });
    } catch (err) {
      console.error(err);
    }
  }


  /**
   * @returns The id of the created document.
   */
  async saveResults({ genes, results, text, name, params, demoID }) {
    name = name || "Untitled Network";
    const id = demoID ? makeID(demoID) : makeID();

    const motifsAndTracksDocument = { 
      _id: id.bson,
      genes, 
      results, // motifs and tracks
      text, // raw text of original results
      params, // params used to generate the results
      creationTime: new Date(),
      demo: Boolean(demoID),
     };

     const stateDocument = {
      name,
      motifsAndTracksID: id.bson,
     };

    await this.db
      .collection(MOTIFS_AND_TRACKS_COLLECTION)
      .insertOne(motifsAndTracksDocument);

    await this.db
      .collection(STATE_DATA_COLLECTION)
      .insertOne(stateDocument);

    return id.string;
  }
  
  
  async createIndexes() {
    await this.db
      .collection(STATE_DATA_COLLECTION)
      .createIndex({ motifsAndTracksID: 1 });
  }


  /**
   * Returns the motifs and tracks document. 
   */
  async getMotifsAndTracks(idStr) {
    let id;
    try {
      id = makeID(idStr);
    } catch {
      console.log(`Invalid ID: '${idStr}'`);
      return null;
    }

    const docResult = await this.db
      .collection(MOTIFS_AND_TRACKS_COLLECTION)
      .findOneAndUpdate(
        { _id: id.bson },
        { $set: { lastAccessTime: new Date() } },
        { returnDocument: 'after',
          projection: { text: 0 } 
        }
      );

    if(!docResult) {
      return null;
    }
    const motifsAndTracks = docResult.value;

    const stateResult = await this.db
      .collection(STATE_DATA_COLLECTION)
      .findOne({ motifsAndTracksID: id.bson });

    if(stateResult) {
      motifsAndTracks.name = stateResult.name;
    }
    return motifsAndTracks;
  }

  /**
   * Returns the motifs and tracks document. 
   */
  async getResultsForExport(idStr, { type }) {
    const id = makeID(idStr);

    let projection; 
    if(type === 'text') {
      projection = { _id: 0 , text: 1 };
    } else if(type === 'params') {
      projection = { _id: 0 , params: 1 };
    } else if(type === 'results') {
      projection = { _id: 0 , results: 1, genes: 1 };
    }

    const docResult = await this.db
      .collection(MOTIFS_AND_TRACKS_COLLECTION)
      .findOne(
        { _id: id.bson },
        { projection }
      );

    return docResult;
  }


  async getGenesForSearch(idStr) { 
    const results = await this.getMotifsAndTracks(idStr);
    return results.genes;
  }

  async getResultsForSearch(idStr) {
    const results = await this.getMotifsAndTracks(idStr);
    return results.results;
  } 


  async idExists(idStr) {
    const id = makeID(idStr);
    const result = await this.db
      .collection(MOTIFS_AND_TRACKS_COLLECTION)
      .count({ _id: id.bson }, { limit: 1 });
    return Boolean(result);
  }


  /**
   * Updates a document--only the 'name' can be updated.
   * @returns true if the network has been found and updated, false otherwise.
   */
  async updateState(idStr, { name }) {
    const id = makeID(idStr);
    
    const res = await this.db
      .collection(STATE_DATA_COLLECTION)
      .updateOne(
        { motifsAndTracksID: id.bson }, 
        { $set: { name: name } }
      );

    return res.modifiedCount > 0;
  }


  async setUIState(idStr, positions, state) {
    const id = makeID(idStr);

    const res = await this.db
      .collection(STATE_DATA_COLLECTION)
      .updateOne(
        { motifsAndTracksID: id.bson }, 
        { $set: { positions, state } }
      );

    return res.modifiedCount > 0;
  }

  
  async getUIState(idStr) {
    const id = makeID(idStr);

    const result = await this.db
      .collection(STATE_DATA_COLLECTION)
      .findOne({ motifsAndTracksID: id.bson });

    return result;  
  }


  async getResultCounts() {
    const result = await this.db
      .collection(MOTIFS_AND_TRACKS_COLLECTION)
      .aggregate([
        { $facet: {
          'user': [
            { $match: { demo: { $ne: true } }},
            { $count: 'total' }
          ],
          'demo': [
            { $match: { demo: true }},
            { $count: 'total' }
          ],
        }},
        { $project: {
          "user": { $arrayElemAt: ["$user.total", 0] },
          "demo": { $arrayElemAt: ["$demo.total", 0] },
        }}
      ]).toArray();
    
    return result[0];
  }

  async getResultStatsCursor() {
    const cursor = await this.db
      .collection(MOTIFS_AND_TRACKS_COLLECTION)
      .aggregate([
        { $match: { demo: { $ne: true } }},
        { $lookup: {
          from: 'stateData', 
          localField: '_id',
          foreignField: 'motifsAndTracksID',
          as: 'stateData'
        }},
        { $project: { 
          name: { $arrayElemAt: ["$stateData.name", 0] },
          creationTime: 1,
          lastAccessTime: 1,
        }}
    ]);
    
    return cursor;
  }

}

const ds = new Datastore(); // singleton

export default ds;
