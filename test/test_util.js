import { expect } from 'chai';
import fs from 'fs';
import {
  createDefaultNetworkName,
  abbreviateSpeciesName,
  parseMotifsAndTracks,
  annotateGenes
} from '../src/server/util.js';
import { speciesNomenclatureDef } from '../src/util/index.js';


describe('createDefaultNetworkName', () => {
  it('should return null if selectedMotifRankingsDatabase is missing', () => {
    const params = { genes: 'gene1;gene2;gene3' };
    const result = createDefaultNetworkName(params);
    expect(result).to.be.null;
  });

  it('should return null if genes are missing', () => {
    const params = { selectedMotifRankingsDatabase: 'assembly__database' };
    const result = createDefaultNetworkName(params);
    expect(result).to.be.null;
  });

  it('should return correct network name for valid params', () => {
    const params = {
      selectedMotifRankingsDatabase: 'hg00_database',
      genes: 'gene1;gene2;gene3;gene4'
    };
    speciesNomenclatureDef['hg00'] = { name: 'Homo sapiens' };
    const result = createDefaultNetworkName(params);
    expect(result).to.equal('H. sapiens (hg00): gene1,gene2,gene3, and 1 others');
  });

  it('should return correct network name when genes are less than maxGenesToShow', () => {
    const params = {
      selectedMotifRankingsDatabase: 'mm00__database',
      genes: 'gene1;gene2'
    };
    speciesNomenclatureDef['mm00'] = { name: 'Mus musculus' };
    const result = createDefaultNetworkName(params);
    expect(result).to.equal('M. musculus (mm00): gene1,gene2');
  });

  it('should return the original species name if it cannot be abbreviated', () => {
    const params = {
      selectedMotifRankingsDatabase: 'dm0_database',
      genes: 'gene1;gene2'
    };
    speciesNomenclatureDef['dm0'] = { name: 'Fly' };
    const result = createDefaultNetworkName(params);
    expect(result).to.equal('Fly (dm0): gene1,gene2');
  });

  it('should handle edge case when speciesNomenclature is undefined', () => {
    const params = {
      selectedMotifRankingsDatabase: 'xx0_database',
      genes: 'gene1;gene2;gene3'
    };
    const result = createDefaultNetworkName(params);
    expect(result).to.equal('undefined (xx0): gene1,gene2,gene3');
  });
});

describe('abbreviateSpeciesName', () => {
  it('should throw an error for invalid species names', () => {
    expect(() => abbreviateSpeciesName('')).to.throw();
    expect(() => abbreviateSpeciesName('Homo')).to.throw(); // must have two words!
  });

  it('should return the abbreviated species name', () => {
    expect(abbreviateSpeciesName('Homo sapiens')).to.equal('H. sapiens');
    expect(abbreviateSpeciesName('Mus musculus')).to.equal('M. musculus');
  });
});

describe('parseMotifsAndTracks', () => {
  let params;
  let results;
  before('load results', () => {
    const paramsData = fs.readFileSync('./test/resources/prostate_cancer_genemania.json', { encoding: 'utf8' });
    params = JSON.parse(paramsData);
    const resultsData = fs.readFileSync('./test/resources/prostate_cancer_genemania.tsv', { encoding: 'utf8' });
    results = parseMotifsAndTracks(resultsData, params);
  });

  it('parsed results must not be empty', () => {
    expect(results).to.be.an('array').that.not.has.lengthOf(0);
  });

  it('should parse motifs correctly', () => {
    const motifs = results.filter((item) => item.type === 'MOTIF');
    expect(motifs).to.be.an('array').that.has.lengthOf(380);
    
    const motif = motifs[0];
    expect(motif.type).to.equal('MOTIF');
    expect(motif.rank).to.equal(1);
    expect(motif.name).to.equal('predrem__nrMotif1946');
    expect(motif.featureID).to.equal(16711754);
    expect(motif.description).to.equal('48_fHeart-DS16819.M1104');
    expect(motif.auc).to.equal(0.0826482);
    expect(motif.nes).to.equal(6.6521);
    expect(motif.candidateTargetGenes).to.be.an('array').that.has.lengthOf(8);
    expect(motif.transcriptionFactors).to.be.an('array').that.has.lengthOf(5);
  });

  it('should parse tracks correctly', () => {
    const tracks = results.filter((item) => item.type === 'TRACK');
    expect(tracks).to.be.an('array').that.has.lengthOf(46);
    
    const track = tracks[39];console.log(track);
    expect(track.type).to.equal('TRACK');
    expect(track.rank).to.equal(40);
    expect(track.name).to.equal('ENCFF002JUH');
    expect(track.featureID).to.equal(16712173);
    expect(track.description).to.equal('TCF12 (HepG2)');
    expect(track.auc).to.equal(0.0544976);
    expect(track.nes).to.equal(3.1499);
    expect(track.candidateTargetGenes).to.be.an('array').that.has.lengthOf(5);
    expect(track.transcriptionFactors).to.be.an('array').that.has.lengthOf(1);
  });
});

describe('annotateGenes', () => {
  it('should annotate genes correctly', () => {
    const genes = [{ name: 'gene1' }, { name: 'gene2' }];
    const results = [
      {
        type: 'MOTIF',
        name: 'motif1',
        candidateTargetGenes: [{ geneID: { name: 'gene1' } }],
        transcriptionFactors: [{ geneID: { name: 'gene2' } }]
      }
    ];
    annotateGenes(genes, results);
    expect(genes[0].motifs).to.include('motif1');
    expect(genes[1].motifs).to.include('motif1');
  });
});