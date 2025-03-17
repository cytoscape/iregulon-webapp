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


export const searchSpaceTypeDef = {
  genes: 'Gene-Based',
  regions: 'Region-Based',
};


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

  getAllRankingsDatabases() {
    return this.rankingsDatabases;
  }

  getSearchSpaceTypes(organism) {
    const types = new Set();
    for (const db of this.rankingsDatabases) {
      if (db.species.assembly === organism.speciesNomenclature.assembly) {
        types.add(db.type);
      }
    }
    return [...types].map(type => ({ id: type, name: searchSpaceTypeDef[type] }));
  }

  getCollections(organism, searchSpaceType, collectionType) {
    const arr = [];
    for (const db of this.rankingsDatabases) {
      if (db.species.assembly === organism.speciesNomenclature.assembly
          && db.type === searchSpaceType
          && db.collection.type === collectionType) {
        if (arr.findIndex(c => c.id === db.collection.id) === -1) {
          arr.push(db.collection);
        }
      }
    }
    arr.sort((a, b) => a.id.localeCompare(b.id));
    arr.unshift({ id: 'none', name: `-- No ${collectionType} collection --` });
    return arr;
  }

  getPutativeRegulatoryRegions(searchSpaceType, motifCollectionId, trackCollectionId) {
    if (searchSpaceType === 'regions') {
      return [{ id: 'none', name: '-- No gene putative regulatory region --' }];
    } else {
      let hasMotifRankingsDBs = false;
      let hasTrackRankingsDBs = false;
      const regRegionMotifSet = new Set();
      const regRegionTrackSet = new Set();
      let regRegionSet;
      for (const db of this.rankingsDatabases) {
        if (db.type === searchSpaceType) {
          if (db.collection.type === 'motif' && db.collection.id === motifCollectionId) {
            regRegionMotifSet.add(db.putativeRegulatoryRegion);
            hasMotifRankingsDBs = true;
          }
          if (db.collection.type === 'track' && db.collection.id === trackCollectionId) {
            regRegionTrackSet.add(db.putativeRegulatoryRegion);
            hasTrackRankingsDBs = true;
          }
        }
      }
      if (hasMotifRankingsDBs && hasTrackRankingsDBs) {
        // Take only those gene putative regulatory regions that are supported in both the motif and track rankings databases
        regRegionSet = new Set([...regRegionMotifSet].filter(x => regRegionTrackSet.has(x)));
      } else if (hasMotifRankingsDBs) {
        // Take only those gene putative regulatory regions that are supported in the motif rankings databases
        regRegionSet = regRegionMotifSet;
      } else {
        // Take only those gene putative regulatory regions that are supported in the track rankings databases
        regRegionSet = regRegionTrackSet;
      }
      return [...regRegionSet].map(id => this._getDelineationById(id)).reduce((acc, cur) => {
        acc.push({ id: cur['$']['id'], name: cur['_'] });
        return acc;
      }, []);
    }
  }

  getRankingsDatabases(organism, searchSpaceType, collectionType, collectionId, regRegionId) {
    const dbs = this.rankingsDatabases.filter(db => {
      return db.species.assembly === organism.speciesNomenclature.assembly
        && db.type === searchSpaceType
        && db.collection.type === collectionType
        && db.collection.id === collectionId
        && db.putativeRegulatoryRegion === regRegionId;
    });
    return dbs;
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
    const id = db['$']['id'];
    const name = db['name'];
    const type = db['type'];
    let assembly = db['species'];
    if (assembly === 'dmel') { assembly = 'dm3'; } // Fix for Drosophila
    const species = speciesNomenclatureDef[assembly];
    
    const collectionType = db['collection']['$']['type'];
    const collectionRefId = db['collection']['$']['refid'];
    const rawCollection = this._getCollectionById(collectionType, collectionRefId);
    const collection = this._createMotifTrackCollection(rawCollection, collectionType);

    const speciesCount = parseInt(db['number-of-species']);
    const nesThreshold = db['default-nes-threshold'] ? parseFloat(db['default-nes-threshold']) : DEFAULT_NES_THRESHOLD;
    const aucThreshold = db['default-auc-threshold'] ? parseFloat(db['default-auc-threshold']) : DEFAULT_AUC_THRESHOLD;
    const rankThreshold = db['default-rank-threshold'] ? parseInt(db['default-rank-threshold']) : DEFAULT_RANK_THRESHOLD;

    let delineationDefault = { id: '', name: '' }; // TODO (?) - Check if this is correct
    if (type === 'genes') {
      const regulatoryRegion = db['delineation']['$']['refid'];
      return {
        id,
        name,
        type,
        species,
        collection,
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
      if (mappings && mappings.mapping.length > 0) {
        for (const m of mappings.mapping) {
          const delineationCurrent = { id: m['$']['id'], name: m['_'] };
          delineations.push(delineationCurrent);
          if (m['$']['default'] && m['$']['default'].toLowerCase() === 'true') {
            delineationDefault = delineationCurrent;
          }
        }
        delineations.push({ id: '_specify', name: 'Specify the Upstream and Downstream Regions...' });
      }
      return {
        id,
        name,
        type,
        species,
        collection,
        speciesCount,
        putativeRegulatoryRegion: 'none',
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

  _getDelineationById(id) {
    const delineations = this.data?.['regulatory-region-delineations'];
    return delineations.find(d => d['$']['id'] === id);
  }

  _createMotifTrackCollection(collection, type) {
    return {
      type,
      id: collection['$']['id'],
      name: collection['_'],
      default: collection['$']['default'] === 'true',
    };
  }
}

export default DataConfig;