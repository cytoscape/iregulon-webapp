import JSZip from 'jszip';
import { Canvg, presets } from 'canvg';
import { saveAs } from 'file-saver';
import { getLegendSVG } from './legend-svg';
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
  IMAGE_SMALL:   'images/enrichment_map_small.png',
  IMAGE_MEDIUM:  'images/enrichment_map_medium.png',
  IMAGE_LARGE:   'images/enrichment_map_large.png',
  IMAGE_PDF:     'images/enrichment_map.pdf',
  IMAGE_LEGEND:  'images/node_color_legend_NES.svg',
  DATA_FOLDER:   'data',
  DATA_ENRICH:   'data/enrichment_results.txt',
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
    const netID = this.cy.data('id');
  
    const fetchExport = async path => {
      const res = await fetch(path);
      return await res.text();
    };
  
    // Let the fethching happen in the background while we generate the images
    const filesPromise = Promise.all([
      fetchExport(`/api/export/enrichment/${netID}`),
      fetchExport(`/api/export/ranks/${netID}`),
      fetchExport(`/api/export/gmt/${netID}`),
    ]);

    // Let image generation run in parallel with fetching data from server
    const blob0 = await this._createNetworkImageBlob(ImageSize.SMALL);
    const blob1 = await this._createNetworkImageBlob(ImageSize.MEDIUM);
    const blob2 = await this._createNetworkImageBlob(ImageSize.LARGE);
    const blob3 = await this._createNetworkPDFBlob();
    const blob4 = await this._createSVGLegendBlob();
    // const blob5 = await this._createNetworkJSONBlob();
    const files = await filesPromise;
    const readme = createREADME(this.controller);
  
    const zip = new JSZip();
    zip.file(Path.IMAGE_SMALL,   blob0);
    zip.file(Path.IMAGE_MEDIUM,  blob1);
    zip.file(Path.IMAGE_LARGE,   blob2);
    zip.file(Path.IMAGE_PDF,     blob3);
    zip.file(Path.IMAGE_LEGEND,  blob4);
    // zip.file(Path.DATA_JSON,     blob5);
    zip.file(Path.DATA_ENRICH,   files[0]);
    zip.file(Path.DATA_RANKS,    files[1]);
    zip.file(Path.DATA_GENESETS, files[2]);
    zip.file(Path.README,        readme);
  
    const fileName = this._getZipFileName('enrichment');
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
    const { cy, bubbleSets } = this.controller;
    const renderer = cy.renderer();
  
    // render the network to a buffer canvas
    const cyoptions = {
      output: 'blob',
      bg: 'white',
      full: true, // full must be true for the calculations below to work
      scale: imageSize.scale,
    };
    const cyCanvas = renderer.bufferCanvasImage(cyoptions);
    const { width, height } = cyCanvas;
  
    // compute the transform to be applied to the bubbleSet svg layer
    // this code was adapted from the code in renderer.bufferCanvasImage()
    var bb = cy.elements().boundingBox();
    const pxRatio = renderer.getPixelRatio();
    const scale = imageSize.scale * pxRatio;
    const dx = -bb.x1 * scale;
    const dy = -bb.y1 * scale;
    const transform = `translate(${dx},${dy})scale(${scale})`;
  
    // get the bubbleSet svg element
    const svgElem = bubbleSets.layer.node.parentNode.cloneNode(true);
    svgElem.firstChild.setAttribute('transform', transform); // firstChild is a <g> tag
  
    // render the bubbleSet svg layer using Canvg library
    const svgCanvas = new OffscreenCanvas(width, height);
    const ctx = svgCanvas.getContext('2d');
    const svgRenderer = await Canvg.from(ctx, svgElem.innerHTML, presets.offscreen());
    await svgRenderer.render();
  
    // combine the layers
    const combinedCanvas = new OffscreenCanvas(width, height);
    const combinedCtx = combinedCanvas.getContext('2d');
    combinedCtx.drawImage(cyCanvas,  0, 0);
    combinedCtx.drawImage(svgCanvas, 0, 0);
  
    const blob = await combinedCanvas.convertToBlob();
    return blob;
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
      includeSvgLayers: true, // include bubbles
    });
    return blob;
  }

  async _createSVGLegendBlob() {
    const svg = getLegendSVG(this.controller);
    return new Blob([svg], { type: 'text/plain;charset=utf-8' });
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
    return `enrichment_map_${suffix}.zip`;
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