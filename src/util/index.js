export const isServer = () => typeof window === typeof undefined;

export const isClient = () => !isServer();

// TODO: Parse this file instead: https://github.com/aertslab/iRegulon/blob/master/src/infrastructure/configuration.xml
export const speciesNomenclatureDef = {
  hg19: {
    id: '1',
    name: 'Homo sapiens',
    assembly: 'hg19',
    nomenclatureCode: 1,
    nomenclature: 'HGNC symbols',
    taxonomy: 9606, // NCBI Taxonomy ID
    commonName: 'human', // Necessay for creating GeneMANIA links
  },
  mm9: {
    id: '2',
    name: 'Mus musculus',
    assembly: 'mm9',
    nomenclatureCode: 2,
    nomenclature: 'MGI symbols',
    taxonomy: 10090,
    commonName: 'mouse',
  },
  dm3: {
    id: '3',
    name: 'Drosophila melanogaster',
    assembly: 'dm3',
    nomenclatureCode: 3,
    nomenclature: 'FlyBase names',
    taxonomy: 7227,
    commonName: 'fly',
  },
};

// TODO: Parse this file instead: https://github.com/aertslab/iRegulon/blob/master/src/infrastructure/configuration.xml
export const organismParams = [
  {
    speciesNomenclature: {
      ...speciesNomenclatureDef['hg19'],
    },
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'hg19_tss_centered_10kb_7sp_mc_v6',
      selectedTrackRankingsDatabase: 'hg19_tss_centered_10kb_chip_v1',
    },
    defaultRecoveryParams: {
      NESThreshold: 3.0,
      AUCThreshold: 0.03,
      rankThreshold: 5000,
    },
    defaultTFPredictionParams: {
      minOrthologous: 0.0,
      maxMotifSimilarityFDR: 0.001,
    },
  },
  {
    speciesNomenclature: {
      ...speciesNomenclatureDef['mm9'],
    },
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'mm9_tss_centered_10kb_7sp_mc_v6',
      selectedTrackRankingsDatabase: 'none',
    },
    defaultRecoveryParams: {
      NESThreshold: 3.0,
      AUCThreshold: 0.03,
      rankThreshold: 5000,
    },
    defaultTFPredictionParams: {
      minOrthologous: 0.0,
      maxMotifSimilarityFDR: 0.001,
    },
  },
  {
    speciesNomenclature: {
      ...speciesNomenclatureDef['dm3'],
    },
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'dm3_regions_pwm_11sp_mc_v6',
      selectedTrackRankingsDatabase: 'none',
    },
    defaultRegionBasedParams: {
      conversionFractionOfOverlap: 0.4,
      conversionDelineation: 'dm3_flybase_up5kb_full_transcript',
    },
    defaultRecoveryParams: {
      NESThreshold: 2.5,
      AUCThreshold: 0.01,
      rankThreshold: 5000,
    },
    defaultTFPredictionParams: {
      minOrthologous: 0.0,
      maxMotifSimilarityFDR: 0.001,
    },
  },
];