import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import { speciesNomenclatureDef } from '../util';


export const DEFAULT_NES_THRESHOLD = 3.0;
export const DEFAULT_AUC_THRESHOLD = 0.03;
export const DEFAULT_RANK_THRESHOLD = 5000;
export const DEFAULT_MIN_ORTHOLOGOUS_IDENTITY = 0.0;
export const DEFAULT_MAX_MOTIF_SIMILARITY_FDR = 0.001;
export const DEFAULT_OVERLAP = 0.4;
export const DEFAULT_UPSTREAM = 5000;
export const DEFAULT_DOWNSTREAM = 5000;


export class DataConfig {

  constructor(filePath) {
    this.filePath = filePath || '/data-config.xml';
    this.data = null;
  }

  async load() {
    try {
      // Fetch the XML file (works in both client and server)
      const response = await fetch(this.filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the XML content as text
      const xmlString = await response.text();

      // Parse the XML string into a JavaScript object
      const parsedData = await parseStringPromise(xmlString, {
        trim: true,
        explicitArray: false,
      });

      // Simplify the parsed structure
      this.data = this._simplifyStructure(parsedData).configuration;

      // Create list of Rankings Databases
      this.rankingsDatabases = [];
      for (const db of this.data['databases']) {
        this.rankingsDatabases.push(this._createRankingsDatabase(db));
      }
    } catch (error) {
      console.error('Error loading or parsing the XML file:', error);
    }
  }

  getRankingsDatabases() {
    return this.rankingsDatabases;
  }

  _simplifyStructure(data) {
    // Define parent-to-child mappings
    const parentToChildMap = {
      'databases': 'database',
      'motif-collections': 'motif-collection',
      'track-collections': 'track-collection',
      'regulatory-region-delineations': 'delineation',
    };

    // Simplify based on the parent-to-child mappings
    for (const [parentKey, childKey] of Object.entries(parentToChildMap)) {
      if (data[parentKey] && data[parentKey][childKey]) {
        data[parentKey] = Array.isArray(data[parentKey][childKey])
          ? data[parentKey][childKey]
          : [data[parentKey][childKey]];
      }
    }

    // Recursively simplify nested objects
    for (const key in data) {
      if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
        data[key] = this._simplifyStructure(data[key]);
      }
    }

    return data;
  }

  _createRankingsDatabase(db) {
    const code = db['$']['id'];
    const name = db['name'];
    const type = db['type'];
    let assembly = db['species'];
    if (assembly === 'dmel') { assembly = 'dm3'; } // Fix for Drosophila
    const species = speciesNomenclatureDef[assembly];
    
    const collectionType = db['collection']['$']['type'];
    const collectionRefId = db['collection']['$']['refid'];
    const collection = this._getCollectionById(collectionType, collectionRefId);
    let motifCollection = { code: 'none', description: '-- No motif collection --' };
    let trackCollection = { code: 'none', description: '-- No track collection --' };
    if (collectionType === 'motif') {
      motifCollection = this._createMotifTrackCollection(collection, collectionType);
    } else if (collectionType === 'track') {
      trackCollection = this._createMotifTrackCollection(collection, collectionType);
    }

    const speciesCount = parseInt(db['number-of-species']);
    const nesThreshold = db['default-nes-threshold'] ? parseFloat(db['default-nes-threshold']) : DEFAULT_NES_THRESHOLD;
    const aucThreshold = db['default-auc-threshold'] ? parseFloat(db['default-auc-threshold']) : DEFAULT_AUC_THRESHOLD;
    const rankThreshold = db['default-rank-threshold'] ? parseInt(db['default-rank-threshold']) : DEFAULT_RANK_THRESHOLD;

    let delineationDefault = { id: '', name: '' };
    if (type === 'genes') {
      const regulatoryRegion = db['delineation']['$']['refid'];
      return {
        code,
        name,
        type,
        species,
        motifCollection,
        trackCollection,
        speciesCount,
        putativeRegulatoryRegion: regulatoryRegion,
        gene2regionDelineations: [],
        delineationDefault,
        nesThreshold,
        aucThreshold,
        rankThreshold,
      };
    } else if (type === 'regions') {
      const delineations = [];
      const mappings = db['mappings'];
      if (mappings && mappings.mapping > 0) {
        for (const mapping of mappings.mapping) {
          const delineationCurrent = { id: mapping['$']['id'], name: mapping['_'] };
          delineations.push(delineationCurrent);
          if (mapping['$']['default'] && mapping['$']['default'].toLowerCase() === 'true') {
            delineationDefault = delineationCurrent;
          }
        }
      }
      return {
        code,
        name,
        type,
        species,
        motifCollection,
        trackCollection,
        speciesCount,
        putativeRegulatoryRegion: '',
        gene2regionDelineations: delineations,
        delineationDefault,
        nesThreshold,
        aucThreshold,
        rankThreshold,
      };
    } else {
      throw new Error('Invalid database type: ' + type);
    }
  }

  _getCollectionById(collectionType, collectionId) {
    const collections = collectionType === 'motif' ? this.data?.['motif-collections'] : this.data?.['track-collections'];
    return collections.find(c => c['$']['id'] === collectionId);
  }

  _createMotifTrackCollection(collection, type) {
    return {
      type,
      code: collection['$']['id'],
      description: collection['_'],
      default: collection['$']['default'] === 'true',
    };
  }
}

export default DataConfig;