import { expect } from 'chai';
import fs from 'fs';
import { parseMotifsAndTracks } from '../src/server/util.js';

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