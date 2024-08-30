import fs from 'fs';
import readline from 'readline';
import { 
  MOTIF_RANKINGS_DATABASE,
  TRACK_RANKINGS_DATABASE,
} from './env.js';


export const organisms = {
  '1_hg38': {
    id: '5',
    name: 'Homo sapiens',
    assembly: 'hg38',
    nomenclatureCode: 1,
    nomenclature: 'HGNC symbols',
  },
  '1_hg19': {
    id: '1',
    name: 'Homo sapiens',
    assembly: 'hg19',
    nomenclatureCode: 1,
    nomenclature: 'HGNC symbols',
  },
  '2_mm10': {
    id: '6',
    name: 'Mus musculus',
    assembly: 'mm10',
    nomenclatureCode: 2,
    nomenclature: 'MGI symbols',
  },
  '2_mm9': {
    id: '2',
    name: 'Mus musculus',
    assembly: 'mm9',
    nomenclatureCode: 2,
    nomenclature: 'MGI symbols',
  },
  '3_dm6': {
    id: '4',
    name: 'Drosophila melanogaster',
    assembly: 'dm6',
    nomenclatureCode: 3,
    nomenclature: 'FlyBase names',
  },
  '3_dm3': {
    id: '3',
    name: 'Drosophila melanogaster',
    assembly: 'dm3',
    nomenclatureCode: 3,
    nomenclature: 'FlyBase names',
  },
};


export async function fileForEachLine(filePath, lineCallback) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    lineCallback(line);
  }
}

/**
 * Parse the TSV text returned by iRegulon's 'results' service.
 * 
 * The following columns are always available:
 * 
 *     0	nomenclature code
 *     1	motif/track rankingsdatabase ID
 *     2	motif/track rank
 *     3	motif/track name
 *     4	feature ID
 *     5	motif/track description
 *     6	AUCValue
 *     7	NEScore
 *     8	clusterNumber
 *     9	candidateTargetIDs (separated by ;)
 *     10	candidateTargetRanks (separated by ;)
 *
 * The following columns are only available (actually not empty) if the motif/track is annotated:
 * 
 *     11	transcriptionFactorNames (separated by ;)
 *     12	motifSimilarityFDR (separated by ;) of the corresponding TF
 *     13	orthologousIdentity (separated by ;) of the corresponding TF
 *     14	similarMotifName (separated by ;) of the corresponding TF
 *     15	similarMotifDescription (separated by ;) of the corresponding TF
 *     16	orthologousGeneName (separated by ;) of the corresponding TF
 *     17	orthologousSpecies (separated by ;) of the corresponding TF
 */
// export function parseResults(text) {
//   const rows = [];

//   if (text && text.length > 0) {
//     text.split('\n').forEach((line) => {
//       const row = {};
      
//       if (line.trim().length > 0) {
//         rows.push(row);

//         line.split('\t').forEach((col, idx) => {
//           col = col.trim();

//           switch (idx) {
//             case 0: // e.g. 1
//               row['nomenclatureCode'] = Number(col); 
//               break;
//             case 1: // e.g. hg38__refseq-r80__10kb_up_and_down_tss__mc_v9
//               row['rankingsDatabase'] = col;
//               break;
//             case 2: // e.g. 5
//               row['rank'] = Number(col);             
//               break;
//             case 3:  // e.g. scertf__badis.HCM1
//               row['name'] = col;                    
//               break;
//             case 4: // e.g. 14759127
//               row['featureID'] = col;                      
//               break;
//             case 5: // e.g. badis.HCM1
//               row['description'] = col;
//               break;
//             case 6: // e.g. 0.0882105
//               row['auc'] = Number(col);
//               break;
//             case 7: // e.g. 4.69575
//               row['nes'] = Number(col);
//               break;
//             case 8: // e.g. 10
//               row['cluster'] = Number(col);
//               break;
//             case 9: // e.g. EGLN1;MXI1;EFNA3;CSRP2;ATXN1;NR3C1;BCOR;PHLDA1;PGM1;TNFAIP8;SCARB1;ECE1;KLHL24;CADM1;DAAM1;PDK1;AK4;GJA1;FYN;ZNF395;EGR1;PRKCA;OLFML2A;SAMD4A;INSIG2
//               row['candidateTargetIDs'] = col.split(';');
//               break;
//             case 10: // e.g. 109;115;122;136;145;159;168;170;197;214;220;261;270;273;289;293;340;357;549;622;644;694;705;717;748
//               row['candidateTargetRanks'] = col.split(';').map(Number);
//               break;
//             case 11: // e.g. EOMES;HOXD12
//               if (col !== '' && col !== 'null') {
//                 row['transcriptionFactorNames'] = col.split(';');
//               }
//               break;
//             case 12: // e.g. -1;-1
//               if (col !== '' && col !== '-1') {
//                 row['motifSimilarityFDR'] = col.split(';').map(Number);
//               }
//               break;
//             case 13: // e.g. -1;-1
//               if (col !== '' && col !== '-1') {
//                 row['orthologousIdentity'] = col.split(';').map(Number);
//               }
//               break;
//             case 14: // e.g. null;null
//               if (col !== '' && col !== 'null') {
//                 row['similarMotifName'] = col.split(';');
//               }
//               break;
//             case 15: // e.g. null;null
//               if (col !== '' && col !== 'null') {
//                 row['similarMotifDescription'] = col.split(';');
//               }
//               break;
//             case 16: // e.g. null;null
//               if (col !== '' && col !== 'null') {
//                 row['orthologousGeneName'] = col.split(';');
//               }
//               break;
//             case 17: // e.g. null;null
//               if (col !== '' && col !== 'null') {
//                 row['orthologousSpecies'] = col.split(';');
//               }
//               break;
//           }
//         });
//       }
//     });
//   }

//   return rows;
// }

export function annotateGenes(genes, results) {
  const geneMap = new Map();

  const newGene = (symbol) => {
    const gene = { name: symbol,  query: false, regulatoryFunction: 'unknown', motifs: [], tracks: [] };
    geneMap.set(gene.name, gene);
    genes.push(gene);
    return gene;
  };

  const addMotifOrTrack = (gene, motifOrTrack) => {
    const type = motifOrTrack.type;
    const name = motifOrTrack.name;
    if (type === 'MOTIF' && !gene.motifs.includes(name)) {
      gene.motifs.push(name);
    } else if (type === 'TRACK' && !gene.tracks.includes(name)) {
      gene.tracks.push(name);
    }
    gene.motifs.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    gene.tracks.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  };

  genes.forEach((gene) => {
    gene.query = true;
    gene.regulatoryFunction = 'unknown';
    gene.motifs = [];
    gene.tracks = [];
    geneMap.set(gene.name, gene);
  });

  results.forEach((motifOrTrack) => {
    // Regulatory Function: regulator|regulated|unknown
    motifOrTrack.candidateTargetGenes.forEach((tgt) => {
      // 'regulated'
      const geneName = tgt.geneID.name;
      let gene = geneMap.get(geneName);
      if (!gene) {
        gene = newGene(geneName);
      }
      if (gene.regulatoryFunction !== 'regulator') {
        gene.regulatoryFunction = 'regulated';
      }
      addMotifOrTrack(gene, motifOrTrack);
    });
    motifOrTrack.transcriptionFactors.forEach((tf) => {
      // 'regulator'
      const geneName = tf.geneID.name;
      let gene = geneMap.get(geneName);
      if (!gene) {
        gene = newGene(geneName);
      }
      if (gene.regulatoryFunction === 'regulated') {
        console.log(`>>> Gene ${geneName} is both a regulator and a target`);
      }
      gene.regulatoryFunction = 'regulator';
      addMotifOrTrack(gene, motifOrTrack);
    });
  });
}

export function parseMotifsAndTracks(results) {
  const motifsAndTracks = [];

  try {
    // Get and parse the results.
    const clusterCodeToNumber = {};
    const motifClusterCodeToNumber = {};
    const trackClusterCodeToNumber = {};
    let totalClusterCount = 0;
    let motifClusterCount = 0;
    let trackClusterCount = 0;

    const lines = results.split("\n");

    for (const line of lines) {
      const col = line.split("\t");

      if (col.length === 11 || col.length === 18) {
        // The following columns are always available:
        //     0	nomenclature code
        //     1	motif/track rankingsdatabase ID
        //     2	motif/track rank
        //     3	motif/track name
        //     4	feature ID
        //     5	motif/track description
        //     6	AUC
        //     7	NES
        //     8	clusterNumber
        //     9	candidateTargetIDs (separated by ;)
        //    10	candidateTargetRanks (separated by ;)
        //
        // The following columns are only available (actually not empty) if the motif/track is annotated:
        //    11	transcriptionFactorNames (separated by ;)
        //    12	motifSimilarityFDR (separated by ;) of the corresponding TF
        //    13	orthologousIdentity (separated by ;) of the corresponding TF
        //    14	similarMotifName (separated by ;) of the corresponding TF
        //    15	similarMotifDescription (separated by ;) of the corresponding TF
        //    16	orthologousGeneName (separated by ;) of the corresponding TF
        //    17	orthologousSpecies (separated by ;) of the corresponding TF
        const assembly = col[1].split("_", 2)[0];
        const sn = organisms[parseInt(col[0]) + '_' + assembly];

        // The candidate target genes.
        const candidateTargetGenes = [];
        // The candidate target gene IDs.
        const candidateTargetGeneIDs = col[9].split(";");
        // The ranks of the target genes.
        const candidateTargetGeneRanks = col[10].split(";");
        
        for (let index = 0; index < candidateTargetGeneIDs.length; index++) {
          const geneID = { name: candidateTargetGeneIDs[index], speciesNomenclature: sn };
          const gene = { geneID, rank: parseInt(candidateTargetGeneRanks[index]), numberOfMotifsOrTracks: 1 };
          candidateTargetGenes.push(gene);
        }

        // Make all the transcription factors related stuff if the 7 last columns have data.
        let transcriptionFactors = [];

        if (col.length === 18) {
          // Transcription factor names.
          const transcriptionFactorNames = parseList(col[11], 'null');
          // False discovery rate of similar motifs.
          const transcriptionFactorMotifSimilarityFDR = parseList(col[12], '-1');
          // Identity between orthologous genes.
          const transcriptionFactorOrthologousIdentity = parseList(col[13], '-1');
          // Names of similar motifs.
          const transcriptionFactorSimilarMotifName = parseList(col[14], 'null');
          // Motif descriptions of similar motifs.
          const transcriptionFactorSimilarMotifDescription = parseList(col[15], 'null');
          // Orthologous gene names.
          const transcriptionFactorOrthologousGeneName = parseList(col[16], 'null');
          // Orthologous species.
          const transcriptionFactorOrthologousSpecies = parseList(col[17], 'null');

          for (let index = 0; index < transcriptionFactorNames.length; index++) {
            const geneID = { name: transcriptionFactorNames[index], speciesNomenclature: sn };
            let tfOrthologousIdentity = parseFloat(transcriptionFactorOrthologousIdentity[index]);
            let tfMotifSimilarity = parseFloat(transcriptionFactorMotifSimilarityFDR[index]);
            if (tfOrthologousIdentity === -1) {
              tfOrthologousIdentity = NaN;
            }
            if (tfMotifSimilarity === -1) {
              tfMotifSimilarity = NaN;
            }
            let similarMotifName = transcriptionFactorSimilarMotifName[index];
            if (similarMotifName === "null") {
              similarMotifName = null;
            }
            let similarMotifDescription = transcriptionFactorSimilarMotifDescription[index];
            if (similarMotifDescription === "null") {
              similarMotifDescription = null;
            }
            let orthologousGeneName = transcriptionFactorOrthologousGeneName[index];
            if (orthologousGeneName === "null") {
              orthologousGeneName = null;
            }
            let orthologousSpecies = transcriptionFactorOrthologousSpecies[index];
            if (orthologousSpecies === "null") {
              orthologousSpecies = null;
            }
            const tf = {
              geneID,
              minOrthologousIdentity: tfOrthologousIdentity,
              maxMotifSimilarityFDR: similarMotifName == null ? Math.NaN : tfMotifSimilarity,
              similarMotifName,
              similarMotifDescription,
              orthologousGeneName,
              orthologousSpecies,
              motifs: [],
              tracks: [],
            };
            transcriptionFactors.push(tf);
          }
        }

        if (col[1] === MOTIF_RANKINGS_DATABASE) {
          // Create a motif cluster name with the original motif cluster number.
          const originalMotifClusterCode = "M" + col[8];

          if (!Object.prototype.hasOwnProperty.call(clusterCodeToNumber, originalMotifClusterCode)) {
            // Keep track of the amount of motif clusters.
            motifClusterCodeToNumber[originalMotifClusterCode] = motifClusterCount + 1;
            motifClusterCount++;
            // Keep track of the total amount of motif and track clusters (needed for coloring motifs/tracks of the same cluster in the same color).
            clusterCodeToNumber[originalMotifClusterCode] = totalClusterCount + 1;
            totalClusterCount++;
          }

          // Make a motif cluster number so the cluster numbers for motifs and tracks will be different, so it can be used to show each cluster in a different color.
          const motifClusterNumber = clusterCodeToNumber[originalMotifClusterCode];
          // Make a new motif cluster code, so the first motif cluster will be "M1".
          const motifClusterCode = "M" + motifClusterCodeToNumber[originalMotifClusterCode];

          // Create a new motif and add it to the collection.
          const mtf = {
            type: 'MOTIF',
            rank: parseInt(col[2]),
            name: col[3],
            featureID: parseInt(col[4]),
            description: col[5],
            auc: parseFloat(col[6]),
            nes: parseFloat(col[7]),
            candidateTargetGenes,
            transcriptionFactors,
            clusterCode: motifClusterCode,
            clusterNumber: motifClusterNumber,
          };
          motifsAndTracks.push(mtf);
        } else if (col[1] === TRACK_RANKINGS_DATABASE) {
          // Create a track cluster name with the original motif cluster number.
          const originalTrackClusterCode = "T" + col[8];

          if (!Object.prototype.hasOwnProperty.call(clusterCodeToNumber, originalTrackClusterCode)) {
            // Keep track of the amount of track clusters.
            trackClusterCodeToNumber[originalTrackClusterCode] = trackClusterCount + 1;
            trackClusterCount++;
            // Keep track of the total amount of motif and track clusters (needed for coloring motifs/tracks of the same cluster in the same color).
            clusterCodeToNumber[originalTrackClusterCode] = totalClusterCount + 1;
            totalClusterCount++;
          }

          // Get a track cluster number so the cluster numbers for motifs and tracks will be different, so it can be used to show each cluster in a different color.
          const trackClusterNumber = clusterCodeToNumber[originalTrackClusterCode];
          // Make a new track cluster code, so the first track cluster will be "T1".
          const trackClusterCode = "T" + trackClusterCodeToNumber[originalTrackClusterCode];

          // Create a new track and add it to the collection.
          const track = {
            type: 'TRACK',
            rank: parseInt(col[2]),
            name: col[3],
            featureID: parseInt(col[4]),
            description: col[5],
            auc: parseFloat(col[6]),
            nes: parseFloat(col[7]),
            candidateTargetGenes,
            transcriptionFactors,
            clusterCode: trackClusterCode,
            clusterNumber: trackClusterNumber,
          };
          motifsAndTracks.push(track);
        } else {
          throw new Error("Motif or track rankingsdatabase '" + col[1] + "' is unknown.");
        }
      } else if (col.length === 2) {
        if (col[0] === "ERROR:") {
          throw new Error(col[1].replaceAll("\\n", " "));
        }
      }
    }
  } catch (error) {
    throw new Error(error.message);
  }

  return motifsAndTracks;
}

function parseList(text, nullValue) {
  if (text) {
    return text?.trim() !== '' && text.toLowerCase() !== nullValue.toLowerCase() ? text.split(";") : [];
  }
  return [];
}