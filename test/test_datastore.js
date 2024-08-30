import Datastore from '../src/server/datastore.js';
import { rankedGeneListToDocument } from '../src/server/datastore.js';
import fs from 'fs';
import { expect } from 'chai';

const GENESET_DB = 'geneset_database.gmt';

describe('Gene Set Queries', () => {

  let networkID;

  before('load genesets, load network, load ranks', async () => {
    const networkStr = fs.readFileSync('./test/resources/network.json', { encoding: 'utf8' });
    const network = JSON.parse(networkStr);

    const ranks = fs.readFileSync('./test/resources/ranks.rnk', { encoding: 'utf8' });

    await Datastore.dropCollectionIfExists(GENESET_DB);
    await Datastore.initializeGeneSetDB('./test/resources/', GENESET_DB);

    networkID = await Datastore.createNetwork(network);
    const ranksDoc = await rankedGeneListToDocument(ranks);
    await Datastore.initializeGeneRanks(GENESET_DB, networkID, ranksDoc);
  });

  it('gets a network', async () => {
    const network = await Datastore.getNetwork(networkID, { nodeLimit: 100 });
    expect(network.networkIDStr).to.eql(networkID);
  });

  it('get a gene sets', async () => {
    const results = await Datastore.getGeneSets(GENESET_DB, ['GENESET_1', 'GENESET_2']);
    expect(results).to.eql([
      { name: "GENESET_1",
        description: "the first geneset",
        genes: ["AAA","BBB","CCC","DDD"]
      },
      { name:"GENESET_2",
        description:"the second geneset",
        genes: ["AAA","BBB","CCC","DDD","EEE","FFF"]
      }
    ]);
  });

  it('gets a geneset with ranks', async () => {
    const results = await Datastore.getGenesWithRanks(networkID, ['GENESET_5']);
    expect(results).to.eql({
      // minRank: 1,
      // maxRank: 11,
      genes: [
        { name: "LLL", rank: 11 },
        { name: "JJJ", rank: 10 },
        { name: "BBB", rank: 2 },
        { name: "AAA", rank: 1 },
      ]
    });
  });

  it('gets more than one geneset with ranks', async () => {
    const results = await Datastore.getGenesWithRanks(networkID, ['GENESET_3', 'GENESET_4']);
    expect(results).to.eql({
      // minRank: 1,
      // maxRank: 11,
      genes: [
        { name: "III", rank: 9 },
        { name: "HHH", rank: 8 },
        { name: "GGG", rank: 7 },
        { name: "CCC", rank: 3 },
        { name: "BBB", rank: 2 },
        { name: "AAA", rank: 1 }
      ]
    });
  });

  it('gets geneset with ranks intersection', async () => {
    const results = await Datastore.getGenesWithRanks(networkID, ['GENESET_3', 'GENESET_4'], true);
    expect(results).to.eql({
      // minRank: 1,
      // maxRank: 11,
      genes: [
        { name: "BBB", rank: 2 },
        { name: "AAA", rank: 1 }
      ]
    });
  });

  it('gets all genesets with ranks', async () => {
    const results = await Datastore.getGenesWithRanks(networkID, []);
    expect(results).to.eql({
      // minRank: 1,
      // maxRank: 11,
      genes: [
        { name: "LLL", rank: 11 },
        { name: "JJJ", rank: 10 },
        { name: "III", rank: 9 },
        { name: "HHH", rank: 8 },
        { name: "GGG", rank: 7 },
        { name: "FFF", rank: 6 },
        { name: "EEE", rank: 5 },
        { name: "DDD", rank: 4 },
        { name: "CCC", rank: 3 },
        { name: "BBB", rank: 2 },
        { name: "AAA", rank: 1 }
      ]
    });
  });

  it('gets the ranked gene list', async () => {
    const results = await Datastore.getRankedGeneList(networkID);
    expect(results).to.eql({ 
      // min: 1,
      // max: 11,
      genes: [
        { name: "AAA", rank: 1 },
        { name: "BBB", rank: 2 },
        { name: "CCC", rank: 3 },
        { name: "DDD", rank: 4 },
        { name: "EEE", rank: 5 },
        { name: "FFF", rank: 6 },
        { name: "GGG", rank: 7 },
        { name: "HHH", rank: 8 },
        { name: "III", rank: 9 },
        { name: "JJJ", rank: 10 },
        { name: "LLL", rank: 11 }
      ]
    });
  });

});