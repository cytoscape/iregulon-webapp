export const isServer = () => typeof window === typeof undefined;

export const isClient = () => !isServer();

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