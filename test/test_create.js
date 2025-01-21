import { expect } from 'chai';
import { describe, it } from 'mocha';
import { createDefaultNetworkName } from '../src/server/routes/api/create.js';
import { speciesNomenclatureDef } from '../src/server/util.js';

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
    speciesNomenclatureDef['hg00'] = { name: 'Species name' };
    const result = createDefaultNetworkName(params);
    expect(result).to.equal('Species name (hg00): gene1,gene2,gene3, and 1 others');
  });

  it('should return correct network name when genes are less than maxGenesToShow', () => {
    const params = {
      selectedMotifRankingsDatabase: 'mm00__database',
      genes: 'gene1;gene2'
    };
    speciesNomenclatureDef['mm00'] = { name: 'Species name' };
    const result = createDefaultNetworkName(params);
    expect(result).to.equal('Species name (mm00): gene1,gene2');
  });

  it('should handle edge case when speciesNomenclature is undefined', () => {
    const params = {
      selectedMotifRankingsDatabase: 'dm0_database',
      genes: 'gene1;gene2;gene3'
    };
    const result = createDefaultNetworkName(params);
    expect(result).to.equal('undefined (dm0): gene1,gene2,gene3');
  });
});