export const isServer = () => typeof window === typeof undefined;

export const isClient = () => !isServer();

// TODO: Parse this file instead: https://github.com/aertslab/iRegulon/blob/master/src/infrastructure/configuration.xml
export const organismParams = [
  {
    id: '5',
    name: 'Homo sapiens',
    assembly: 'hg38',
    nomenclatureCode: 1,
    nomenclature: 'HGNC symbols',
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'hg38__refseq-r80__10kb_up_and_down_tss__mc_v9',
      selectedTrackRankingsDatabase: 'hg38__refseq-r80__10kb_up_and_down_tss__tc_v1',
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
    id: '1',
    name: 'Homo sapiens',
    assembly: 'hg19',
    nomenclatureCode: 1,
    nomenclature: 'HGNC symbols',
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'hg19_tss_centered_10kb_7sp_mc_v9',
      selectedTrackRankingsDatabase: 'hg19_tss_centered_10kb_tc_v1',
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
    id: '6',
    name: 'Mus musculus',
    assembly: 'mm10',
    nomenclatureCode: 2,
    nomenclature: 'MGI symbols',
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'mm10__refseq-r80__10kb_up_and_down_tss__mc_v9',
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
    id: '2',
    name: 'Mus musculus',
    assembly: 'mm9',
    nomenclatureCode: 2,
    nomenclature: 'MGI symbols',
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'mm9_tss_centered_10kb_7sp_mc_v9',
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
    id: '4',
    name: 'Drosophila melanogaster',
    assembly: 'dm6',
    nomenclatureCode: 3,
    nomenclature: 'FlyBase names',
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'dm6_regions_pwm_11sp_mc_v9',
      selectedTrackRankingsDatabase: 'none',
    },
    defaultRegionBasedParams: {
      conversionFractionOfOverlap: 0.4,
      conversionDelineation: 'dm6_symbol_up5kb_full_transcript',
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
  {
    id: '3',
    name: 'Drosophila melanogaster',
    assembly: 'dm3',
    nomenclatureCode: 3,
    nomenclature: 'FlyBase names',
    defaultRankingParams: {
      selectedMotifRankingsDatabase: 'dm3_regions_pwm_11sp_mc_v9',
      selectedTrackRankingsDatabase: 'none',
    },
    defaultRegionBasedParams: {
      conversionFractionOfOverlap: 0.4,
      conversionDelineation: 'dm3_symbol_up5kb_full_transcript',
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

