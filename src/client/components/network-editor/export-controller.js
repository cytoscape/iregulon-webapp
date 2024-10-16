import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import dedent from 'dedent';
// eslint-disable-next-line no-unused-vars
import { NetworkEditorController } from './controller';


// Sizes of exported PNG images
export const ImageSize = {
  SMALL:  { value:'SMALL',  scale: 0.5 },
  MEDIUM: { value:'MEDIUM', scale: 1.0 },
  LARGE:  { value:'LARGE',  scale: 2.0 },
};

const Path = {
  IMAGE_FOLDER:  'images',
  IMAGE_SMALL:   'images/iregulon_small.png',
  IMAGE_MEDIUM:  'images/iregulon_medium.png',
  IMAGE_LARGE:   'images/iregulon_large.png',
  IMAGE_PDF:     'images/iregulon.pdf',
  IMAGE_LEGEND:  'images/node_color_legend_NES.svg',
  DATA_FOLDER:   'data',
  DATA_ENRICH:   'data/iregulon_results.txt',
  DATA_RANKS:    'data/ranks.txt',
  DATA_GENESETS: 'data/gene_sets.gmt',
  DATA_JSON:     'data/network.json',
  README:        'README.md'
};


export class ExportController {

  /**
   * @param {NetworkEditorController} controller
   */
  constructor(controller) {
    this.controller = controller;
    this.cy = controller.cy;
  }

  async exportArchive() {
    console.log('Exporting archive...');
    const netID = this.cy.data('id');
  
    const fetchExport = async path => {
      const res = await fetch(path);
      return await res.text();
    };
  
    // Let the fethching happen in the background while we generate the images
    // const filesPromise = Promise.all([
    //   fetchExport(`/api/export/enrichment/${netID}`),
    //   fetchExport(`/api/export/ranks/${netID}`),
    //   fetchExport(`/api/export/gmt/${netID}`),
    // ]);

    // Let image generation run in parallel with fetching data from server
    const blob0 = await this._createNetworkImageBlob(ImageSize.SMALL);
    const blob1 = await this._createNetworkImageBlob(ImageSize.MEDIUM);
    const blob2 = await this._createNetworkImageBlob(ImageSize.LARGE);
    const blob3 = await this._createNetworkPDFBlob();
    // const blob5 = await this._createNetworkJSONBlob();
    // const files = await filesPromise;
    // const readme = createREADME(this.controller);
  
    const zip = new JSZip();
    zip.file(Path.IMAGE_SMALL,   blob0);
    zip.file(Path.IMAGE_MEDIUM,  blob1);
    zip.file(Path.IMAGE_LARGE,   blob2);
    zip.file(Path.IMAGE_PDF,     blob3);
    // zip.file(Path.DATA_JSON,     blob5);
    // zip.file(Path.DATA_ENRICH,   files[0]);
    // zip.file(Path.DATA_RANKS,    files[1]);
    // zip.file(Path.DATA_GENESETS, files[2]);
    // zip.file(Path.README,        readme);
  
    const fileName = this._getZipFileName('iregulon');
    this._saveZip(zip, fileName);
  }

  async exportGeneList(genesJSON, pathways) { // used by the gene list panel (actually left-drawer.js)
    if(pathways.length == 0)
      return;

    let fileName = 'gene_ranks.zip';
    if(pathways.length == 1)
      fileName = `gene_ranks_(${pathways[0]}).zip`;
    else if(pathways.length <= 3)
      fileName = `gene_ranks_(${pathways.slice(0,3).join(',')}).zip`;
    else
      fileName = `gene_ranks_${pathways.length}_pathways.zip`;

    const geneLines = ['gene\trank'];
    for(const { name, rank } of genesJSON) {
      geneLines.push(`${name}\t${rank}`);
    }
    const genesText = geneLines.join('\n');
    const pathwayText = pathways.join('\n');
  
    const zip = new JSZip();
    zip.file('gene_ranks.txt', genesText);
    zip.file('pathways.txt', pathwayText);

    this._saveZip(zip, fileName);
  }


  async _createNetworkImageBlob(imageSize) {
    const { cy } = this.controller;
    return await cy.png({
      output: 'blob',
      bg: 'white',
      full: true, 
      scale: imageSize.scale,
    });
  }

  async _createNetworkJSONBlob() {
    const { cy } = this.controller;
    const json = cy.json();
    const blob = new Blob(
      [ JSON.stringify(json, null, 2) ], {
      type: 'text/plain'
    });
    return blob;
  }

  async _createNetworkPDFBlob() {
    const { cy } = this.controller;
    const blob = await cy.pdf({
      paperSize: 'LETTER',
      orientation: 'LANDSCAPE',
      full: true, // ignore zoom level
      includeSvgLayers: false, // there are no bubbles like in EM
    });
    return blob;
  }

  _getZipFileName(suffix) {
    const networkName = this.cy.data('name');
    if(networkName) {
      // eslint-disable-next-line no-control-regex
      const reserved = /[<>:"/\\|?*\u0000-\u001F]/g;
      if(!reserved.test(networkName)) {
        return `${networkName}_${suffix}.zip`;
      }
    }
    return `iregulon_${suffix}.zip`;
  }

  async _saveZip(zip, fileName) {
    const archiveBlob = await zip.generateAsync({ type: 'blob' });
    await saveAs(archiveBlob, fileName);
  }

}


function createREADME(controller) {
  const { cy } = controller;
  const name = cy.data('name');
  const parameters = cy.data('parameters');
  const db = cy.data('geneSetCollection');
  const link = window.location.href;

  return dedent`
    iRegulon - ${name}
    -------------------------${'-'.repeat(name.length)}

    Network Permalink: ${link}

    iRegulon is a web-app that allows you to perform functional enrichment analysis on 
    gene lists derived from RNA-seq experiments and visualise the results as a network.

    This archive contains the following files:
    * ${Path.IMAGE_LARGE}
    * ${Path.IMAGE_MEDIUM}
    * ${Path.IMAGE_SMALL}
      * Network PNG images in various sizes.
    * ${Path.IMAGE_LEGEND}
      * An SVG image of the NES color legend used for the nodes in the network.
    * ${Path.DATA_ENRICH}
      * Results of Gene Set Enrichment Analysis from the FGSEA R package.
    * ${Path.DATA_RANKS}
      * Gene ranks.
    * ${Path.DATA_GENESETS}
      * Gene sets (pathways) that correspond to nodes in the network.


    How to cite iRegulon
    -------------------------
    To cite this app in a paper, for now, please cite this article 
    (an article specific to this app will be published shortly):

    https://doi.org/10.1371/journal.pcbi.1003731
    Janky, R., Verfaillie, A., ..., Aerts, S.
    iRegulon: From a Gene List to a Gene Regulatory Network Using Large Motif and Track Collections.
    PLoS Comput Biol. 2014 Jul 24;10(7):e1003731. 


    Importing data into the Cytoscape iRegulon App
    ---------------------------------------------------
    * Download and install Cytoscape
      * https://cytoscape.org/download.html
    * Download and install the iRegulon App
      * https://apps.cytoscape.org/apps/iregulon
    * TODO...
    * Documentation for the iRegulon Cytoscape App is available here...
      * http://iregulon.aertslab.org/index.html
    
    
    iRegulon parameters
    -----------------------------
    * TODO...
  `;
}