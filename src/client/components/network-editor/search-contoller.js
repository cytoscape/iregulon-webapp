import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import MiniSearch from 'minisearch';


export class SearchController {

  constructor(cy, bus) {
    this.cy = cy;
    this.networkIDStr = cy.data('id');
    this.bus = bus || new EventEmitter();

    this.genesReady = false;
    this.resultsReady = false;

    this.bus.on('networkLoaded', () => {
      Promise.all([
        this._fetchAllGenes(),
        this._fetchResults(),
      ]).then(() => {
        this._indexClusters();
      }).then(() => {
        this.genesReady = true;
        this.bus.emit('geneListIndexed');
      });
    });
  }

  isGeneListIndexed() {
    return this.genesReady;
  }

  isResultListIndexed() {
    return this.resultsReady;
  }

  queryGenes() {
    const genes = Object.values(this.geneMiniSearch.toJSON().storedFields);
    return genes;
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

  getGenes() {
    return Object.values(this.geneMiniSearch.toJSON().storedFields);
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

  getResults(type) {
    if (type === 'CLUSTER') {
      return Object.values(this.clustersMiniSearch.toJSON().storedFields);
    }
    const results = Object.values(this.resultsMiniSearch.toJSON().storedFields);
    if (type != null) {
      return results.filter(r => r.type === type);
    }
    return results;
  }

  /**
   * Fetches all genes (query + results).
   */
  async _fetchAllGenes() {
    const res = await fetch(`/api/${this.networkIDStr}/genesforsearch`);

    if (res.ok) {
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

      const documents = await res.json();
      console.log('Search docs (GENES)', documents);
      this.geneMiniSearch.addAll(documents);
    }
  }

  /**
   * Fetches and indexes the iRegulon results.
   */
  async _fetchResults() {
    const res = await fetch(`/api/${this.networkIDStr}/results`);

    if (res.ok) {
      this.resultsMiniSearch = new MiniSearch({
        idField: 'name',
        fields: ['name', 'description'],
        storeFields: [
          'type',
          'nomenclatureCode',
          'rankingsDatabase',
          'rank',
          'name',
          'featureID',
          'description',
          'auc',
          'nes',
          'clusterNumber',
          'clusterCode',
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

      const documents = await res.json();
      console.log('Search docs (RESULTS)', documents);
      this.resultsMiniSearch.addAll(documents);
    }
  }

  _indexClusters() {
    this.clustersMiniSearch = new MiniSearch({
      idField: 'name',
      fields: ['name'],
      storeFields: [
        'type',
        'resultType',
        'name',
        'clusterCode',
        'clusterNumber',
        'motifsAndTracks',
        'candidateTargetGenes',
        'transcriptionFactors',
      ]
    });

    const geneNames = this.queryGenes().map(g => g.name);
    const documents = this._getMotifAndTrackClusters(this.getResults(), geneNames);
    console.log('Search docs (CLUSTERS)', documents);
    this.clustersMiniSearch.addAll(documents);

    this.resultsReady = true;
    this.bus.emit('resultsIndexed');
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
      return Math.min(...motifsAndTracks.map((mt) => mt.nes));
    };
    const clusters = Array.from(cluster2motifsAndTracks.values());
    clusters.sort((a, b) =>  getMaxNES(b) - getMaxNES(a));
  
    // 3. Iterate motifs and tracks and translate them to MotifAndTrackCluster objects.
    const alreadyProcessedTFIDsForMotifs = new Set();
    const alreadyProcessedTFIDsForTracks = new Set();
    const mtClusters = [];
    
    for (const motifsAndTracks of clusters) {
      const clusterCode = motifsAndTracks[0].clusterCode;
      const sortedMotifsOrTracks = [...motifsAndTracks].sort((a, b) => a.nes - b.nes);
      const transcriptionFactors = this._combineTranscriptionFactors(motifsAndTracks, geneNames);
      
      if (transcriptionFactors.length === 0) continue;
  
      const curTFID = transcriptionFactors[0].geneID.name;
      const type = motifsAndTracks[0].type;
  
      if (type === 'MOTIF') {
        if (alreadyProcessedTFIDsForMotifs.has(curTFID)) continue;
      } else if (type === 'TRACK') {
        if (alreadyProcessedTFIDsForTracks.has(curTFID)) continue;
      }

      const clusterNumber = motifsAndTracks[0].clusterNumber;
      const candidateTargetGenes = this._combineTargetGenes(motifsAndTracks);
      const cluster = {
        type: 'CLUSTER',
        resultType: type,
        name: transcriptionFactors[0].geneID.name,
        clusterCode,
        clusterNumber,
        motifsAndTracks: sortedMotifsOrTracks,
        transcriptionFactors,
        candidateTargetGenes,
      };
      mtClusters.push(cluster);
  
      if (type === 'MOTIF') {
        alreadyProcessedTFIDsForMotifs.add(curTFID);
      } else if (type === 'TRACK') {
        alreadyProcessedTFIDsForTracks.add(curTFID);
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
  
    const tfAttributes = Array.from(tf2attributes.values()).sort();
  
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
    const geneID2attributes = new Map();
  
    for (const motifOrTrack of motifsAndTracks) {
      for (const targetGene of motifOrTrack.candidateTargetGenes) {
        if (geneID2attributes.has(targetGene.geneID)) {
          const attributes = geneID2attributes.get(targetGene.geneID);
          const rank = targetGene.rank;
          attributes.minRank = Math.min(rank, attributes.minRank);
          attributes.motifAndTrackCount++;
        } else {
          const attributes = { minRank: targetGene.rank, motifAndTrackCount: 1 };
          geneID2attributes.set(targetGene.geneID, attributes);
        }
      }
    }
  
    const targetGenes = [];
    for (const geneID of geneID2attributes.keys()) {
      const attributes = geneID2attributes.get(geneID);
      const candidateTargetGene = { geneID, rank: attributes.minRank, motifAndTrackCount: attributes.motifAndTrackCount };
      targetGenes.push(candidateTargetGene);
    }
    targetGenes.sort();
  
    return targetGenes;
  }
}