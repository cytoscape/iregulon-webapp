import EventEmitter from 'eventemitter3';
import MiniSearch from 'minisearch';
import { resultId } from '../util';


export class SearchController {

  constructor(cy, bus) {
    this.cy = cy;
    this.networkIDStr = cy.data('id');
    this.bus = bus || new EventEmitter();

    this.genesReady = false;
    this.resultsReady = false;
  }

  initializeResults(resultsJson) {
    console.log('SearchController.initializeResults', resultsJson);
    this._initializeAllGenes(resultsJson.genes);
    this._initializeResults(resultsJson.results);
    this.bus.emit('geneListIndexed');
    this.bus.emit('resultsIndexed');
  }

  isGeneListIndexed() {
    return this.genesReady;
  }

  isResultListIndexed() {
    return this.resultsReady;
  }

  searchGenes(query) {
    if (!this.isGeneListIndexed()) {
      throw "The gene list hasn't been fecthed yet!";
    }
    if (query && query.length > 0) {
      return this.geneMiniSearch.search(query, { fields: ['name'], prefix: true });
    }
    return [];
  }

  getGenes(isQuery) {
    if (!this.isGeneListIndexed()) {
      throw "The gene list hasn't been fecthed yet!";
    }
    let genes = Object.values(this.geneMiniSearch.toJSON().storedFields);
    if (isQuery) {
      genes = genes.filter(g => g.query === true);
    }
    return genes;
  }

  getRegulatorGenes() {
    if (!this.isGeneListIndexed()) {
      throw "The gene list hasn't been fecthed yet!";
    }
    return this.getGenes().filter(g => g.regulatoryFunction === 'regulator');
  }

  searchResults(query) {
    if (!this.isResultListIndexed()) {
      throw "The results haven't been fecthed yet!";
    }
    if (query && query.length > 0) {
      return this.resultsMiniSearch.search(query, { fields: ['name', 'description'], prefix: true });
    }
    return [];
  }

  searchClusters(query) {
    if (!this.isResultListIndexed()) {
      throw "The results haven't been fecthed yet!";
    }
    if (query && query.length > 0) {
      return this.clustersMiniSearch.search(query, { fields: ['name', 'description'], prefix: true });
    }
    return [];
  }

  getResultById(id) {
    const all = Object.values(this.resultsMiniSearch.toJSON().storedFields);
    return all?.find(obj => obj.id === id);
  }

  getClusterById(id) {
    const all = Object.values(this.clustersMiniSearch.toJSON().storedFields);
    return all?.find(obj => obj.id === id);
  }

  getResults(type) {
    if (type === 'CLUSTER') {
      // Return only clusters
      return Object.values(this.clustersMiniSearch.toJSON().storedFields);
    }
    let results = Object.values(this.resultsMiniSearch.toJSON().storedFields);
    if (type == null) {
      // Return all results, including clusters
      results.push(...Object.values(this.clustersMiniSearch.toJSON().storedFields));
    } else {
      // Return motifs or tracks
      return results.filter(r => r.type === type);
    }
    return results;
  }

  countResults(type) {
    if (type === 'CLUSTER') {
      return this.clustersMiniSearch.documentCount;
    }
    if (type == null) {
      // All results, including clusters
      return this.clustersMiniSearch.documentCount + this.resultsMiniSearch.documentCount;
    }
    // Motifs or tracks
    return Object.values(this.resultsMiniSearch.toJSON().storedFields).filter(r => r.type === type).length;
  }


  /**
   * Initializes all genes (query + results).
   */
  _initializeAllGenes(genes) {
    this.geneMiniSearch = new MiniSearch({
      idField: 'name',
      fields: ['name'],
      storeFields: [
        'name',
        'query',
        'regulatoryFunction',
        'motifs',
        'tracks',
      ]
    });

    this.geneMiniSearch.addAll(genes);
    this.genesReady = true;
  }

  /**
   * Fetches and indexes the iRegulon results.
   */
  _initializeResults(results) {
    this._indexMotifsAndTracks(results);

    const geneNames = this.getGenes().map(g => g.name);
    const clusterDocuments = this._getMotifAndTrackClusters(results, geneNames);
    this._indexClusters(clusterDocuments);

    console.log('Results indexed:', results.length, '--', clusterDocuments.length);
    this.resultsReady = true;
  }

  _indexMotifsAndTracks(documents) {
    this.resultsMiniSearch = new MiniSearch({
      idField: 'id',
      fields: ['id', 'name', 'description'],
      storeFields: [
        'id',
        'type',
        'nomenclatureCode',
        'rankingsDatabase',
        'rank',
        'name',
        'featureID',
        'description',
        'auc',
        'nes',
        'clusterCode',
        'clusterNumber',
        'candidateTargetGenes',
        'candidateTargetRanks',
        'transcriptionFactors',
        'motifSimilarityFDR',
        'orthologousIdentity',
        'similarMotifName',
        'similarMotifDescription',
        'orthologousGeneName',
        'orthologousSpecies',
      ]
    });
    // Add an `id` field to each document
    documents?.forEach((doc) => doc.id = resultId(doc));
    console.log('Search docs (RESULTS)', documents);
    this.resultsMiniSearch.addAll(documents);
  }

  _indexClusters(documents) {
    this.clustersMiniSearch = new MiniSearch({
      idField: 'id',
      fields: ['id', 'name'],
      storeFields: [
        'id',
        'type',
        'resultType',
        'name',
        'nes',
        'clusterCode',
        'clusterNumber',
        'motifsAndTracks',
        'candidateTargetGenes',
        'transcriptionFactors',
      ]
    });
    // Add an `id` field to each document
    documents?.forEach((doc) => doc.id = resultId(doc));
    console.log('Search docs (CLUSTERS)', documents);
    this.clustersMiniSearch.addAll(documents);
  }

  _getMotifAndTrackClusters(results, geneNames) {
    // 1. Group motifs and tracks according to STAMP cluster number.
    const cluster2motifsAndTracks = new Map();
    for (const mt of results) {
      const curCode = mt.clusterCode;
      let arr;
      if (cluster2motifsAndTracks.has(curCode)) {
        arr = cluster2motifsAndTracks.get(curCode);
      } else {
        arr = [];
        cluster2motifsAndTracks.set(curCode, arr);
      }
      arr.push(mt);
    }
  
    // 2. Sort clusters according to maximum NESCore.
    const getMaxNES = (motifsAndTracks) => {
      return Math.max(...motifsAndTracks.map((mt) => mt.nes));
    };
    const clusters = Array.from(cluster2motifsAndTracks.values());
    clusters.sort((a, b) =>  getMaxNES(b) - getMaxNES(a));
  
    // 3. Iterate motifs and tracks and translate them to MotifAndTrackCluster objects.
    const visitedMotifTFs = new Set();
    const visitedTrackTFs = new Set();
    const mtClusters = [];
    
    for (const motifsAndTracks of clusters) {
      const transcriptionFactors = this._combineTranscriptionFactors(motifsAndTracks, geneNames);
      
      if (transcriptionFactors.length === 0) continue;
  
      const tfName = transcriptionFactors[0].geneID.name;
      const type = motifsAndTracks[0].type;
  
      if (type === 'MOTIF') {
        if (visitedMotifTFs.has(tfName)) continue;
      } else if (type === 'TRACK') {
        if (visitedTrackTFs.has(tfName)) continue;
      }

      const clusterNumber = motifsAndTracks[0].clusterNumber;
      const clusterCode = motifsAndTracks[0].clusterCode;
      const sortedMotifsOrTracks = [...motifsAndTracks].sort((a, b) => b.nes - a.nes);
      const candidateTargetGenes = this._combineTargetGenes(motifsAndTracks);
      const cluster = {
        type: 'CLUSTER',
        resultType: type,
        name: transcriptionFactors[0].geneID.name,
        clusterCode,
        clusterNumber,
        nes: getMaxNES(motifsAndTracks),
        motifsAndTracks: sortedMotifsOrTracks,
        transcriptionFactors,
        candidateTargetGenes,
      };
      mtClusters.push(cluster);
  
      if (type === 'MOTIF') {
        visitedMotifTFs.add(tfName);
      } else if (type === 'TRACK') {
        visitedTrackTFs.add(tfName);
      }
    }
  
    return mtClusters;
  }
  
  _combineTranscriptionFactors(motifsAndTracks, geneNames) {
    const tf2attributes = new Map();
  
    const updateAttributes = (attributes, motifOrTrack) => {
      attributes.nes = Math.max(motifOrTrack.nes, attributes.nes);
      if (!attributes.motifs) attributes.motifs = [];
      if (!attributes.tracks) attributes.tracks = [];
      if (motifOrTrack.type === 'MOTIF') {
        attributes.motifs.push(motifOrTrack);
      } else if (motifOrTrack.type === 'TRACK') {
        attributes.tracks.push(motifOrTrack);
      }
    };
  
    motifsAndTracks.forEach((mt) => {
      mt.transcriptionFactors.forEach((tf) => {
        const key = tf.geneID.name;
        if (tf2attributes.has(key)) {
          const attributes = tf2attributes.get(key);
          updateAttributes(attributes, mt);
        } else {
          const attributes = {
            transcriptionFactor: tf,
            presentInSignature: geneNames.includes(key),
            motifs: [],
            tracks: [],
          };
          updateAttributes(attributes, mt);
          tf2attributes.set(tf, attributes);
        }
      });
    });

    const tfAttributes = Array.from(tf2attributes.values());
    this._sortTranscriptionFactorAttributes(tfAttributes);

    const result = [];
    const ids = new Set();
    for (const attributes of tfAttributes) {
      const tf = attributes.transcriptionFactor;
      const key = tf.geneID.name;
      if (!ids.has(key)) {
        result.push(tf);
        ids.add(key);
      }
    }
  
    return result;
  }
  
  _combineTargetGenes(motifsAndTracks) {
    const gene2attributes = new Map();
  
    for (const mt of motifsAndTracks) {
      for (const targetGene of mt.candidateTargetGenes) {
        const key = targetGene.geneID.name;

        if (gene2attributes.has(key)) {
          const attributes = gene2attributes.get(key);
          attributes.minRank = Math.min(targetGene.rank, attributes.minRank);
        } else {
          gene2attributes.set(key, { geneID: targetGene.geneID, minRank: targetGene.rank });
        }
      }
    }
  
    const targetGenes = [];

    for (const key of gene2attributes.keys()) {
      const attributes = gene2attributes.get(key);
      const candidateTargetGene = { geneID: attributes.geneID, rank: attributes.minRank };
      targetGenes.push(candidateTargetGene);
    }

    this._sortCandidateTargetGenes(targetGenes);
  
    return targetGenes;
  }
   
  _sortTranscriptionFactorAttributes(attributes) {
    return attributes.sort((a, b) => {
      // Compare `presentInSignature`
      if (a.presentInSignature && !b.presentInSignature) return -1;
      if (!a.presentInSignature && b.presentInSignature) return 1;
      // Compare NES in descending order
      if (b.nes !== a.nes) {
        return b.nes - a.nes;
      }
       // Compare `maxMotifSimilarityFDR` (ascending)
      if (a.transcriptionFactor.maxMotifSimilarityFDR !== b.transcriptionFactor.maxMotifSimilarityFDR) {
        return a.transcriptionFactor.maxMotifSimilarityFDR - b.transcriptionFactor.maxMotifSimilarityFDR;
      }
      // Compare `minOrthologousIdentity` (descending)
      if (a.transcriptionFactor.minOrthologousIdentity !== b.transcriptionFactor.minOrthologousIdentity) {
        return b.transcriptionFactor.minOrthologousIdentity - a.transcriptionFactor.minOrthologousIdentity;
      }
      // Compare `transcriptionFactor.name` lexicographically (case-insensitive)
      return a.transcriptionFactor.geneID.name.localeCompare(b.transcriptionFactor.geneID.name, undefined, { sensitivity: 'base' });
    });
  }

  _sortCandidateTargetGenes(genes) {
    return genes.sort((a, b) => {
      // Compare by `rank` (ascending)
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      // Compare by `geneName` (case-insensitive alphabetical order)
      return a.geneID.name.localeCompare(b.geneID.name, undefined, { sensitivity: 'base' });
    });
  }
}