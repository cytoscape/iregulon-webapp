import fs from 'fs';
import readline from 'readline';

import { speciesNomenclatureDef } from '../util/index.js';


export function createDefaultNetworkName(params) {
  const { selectedMotifRankingsDatabase, genes } = params;
  // Handle edge cases
  if (!selectedMotifRankingsDatabase || !genes) {
      return null;
  }
  const geneList = genes.split(';');
  const assembly = selectedMotifRankingsDatabase?.split('_')[0];
  const speciesNomenclature = speciesNomenclatureDef[assembly];
  // Abbreviate the species name
  const speciesName = speciesNomenclature?.name;
  const speciesAbbreviation = speciesName && speciesName.includes(' ') ? abbreviateSpeciesName(speciesName) : speciesName;
  // Generate the gene preview (first few genes and count of remaining genes)
  const totalGenes = geneList.length;
  const maxGenesToShow = 3; // Number of genes to display in the title
  const displayedGenes = geneList.slice(0, maxGenesToShow).join(",");
  const remainingCount = totalGenes - maxGenesToShow;
  const genePreview = remainingCount > 0 
  ? `${displayedGenes}, and ${remainingCount} others`
      : displayedGenes;
  // Construct the title
  return `${speciesAbbreviation} (${assembly}): ${genePreview}`;
}
 
/**
 * Abbreviates a species name in scientific nomenclature.
 * @param {string} speciesName - The full species name (e.g., "Homo sapiens").
 * @returns {string} - The abbreviated species name (e.g., "H. sapiens").
 */
export function abbreviateSpeciesName(speciesName) {
  if (!speciesName || typeof speciesName !== 'string') {
    throw new Error('Invalid species name. Please provide a valid scientific name.');
  }

  const parts = speciesName.trim().split(/\s+/); // Split by whitespace
  if (parts.length < 2) {
    throw new Error('Scientific names must contain at least two parts: genus and species.');
  }

  const genus = parts[0];
  const species = parts[1];
  const genusAbbreviation = genus.charAt(0).toUpperCase(); // Get the first letter and capitalize

  return `${genusAbbreviation}. ${species}`;
}

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

export function parseMotifsAndTracks(results, params) {
  const motifsAndTracks = [];

  const motifRankingsDatabase = params.selectedMotifRankingsDatabase;
  const trackRankingsDatabase = params.selectedTrackRankingsDatabase;

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
        const sn = speciesNomenclatureDef[assembly];

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

        if (col[1] === motifRankingsDatabase) {
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
        } else if (col[1] === trackRankingsDatabase) {
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