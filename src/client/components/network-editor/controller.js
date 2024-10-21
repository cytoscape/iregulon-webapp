import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';

import { DEFAULT_PADDING } from '../defaults';
import { rowId, rowTypeIdField } from '../util';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng';
import { SearchController } from './search-contoller';
import { ExportController } from './export-controller';
import { UndoHandler } from './undo-stack';


// Clusters that have this many nodes get optimized.
// Note we are using number of nodes as a proxy for number of edges, assuming large clusters are mostly complete.
const LARGE_CLUSTER_SIZE = 33; // approx 500 edges in a complete graph

// Keys for scratch data
export const Scratch = {
  // boolean flag indicating if the expand/collapse layout is currently running, attached to parent nodes
  LAYOUT_RUNNING: '_layoutRunning',
  // BubblePath instance, attached to parent nodes
  BUBBLE: '_bubble',
  // The HTML element for the expand/collapse toggle buttons, attached to parent nodes
  TOGGLE_BUTTON_ELEM: '_buttonElem',
  AUTOMOVE_RULE: '_automoveRule'
};


/**
 * The network editor controller contains all high-level model operations that the network
 * editor view can perform.
 *
 * @property {Cytoscape.Core} cy The graph instance
 * @property {EventEmitter} bus The event bus that the controller emits on after every operation
 * @property {Number} minRank The minimum rank value of the current network
 * @property {Number} maxRank The maximum rank value of the current network
 * @property {String} networkIDStr The network UUID
 */
export class NetworkEditorController {
  /**
   * Create an instance of the controller
   * @param {Cytoscape.Core} cy The graph instance (model)
   * @param {EventEmitter} bus The event bus that the controller emits on after every operation
   */
  constructor(cy, bus) {
    /** @type {Cytoscape.Core} */
    this.cy = cy;
    /** @type {EventEmitter} */
    this.bus = bus || new EventEmitter();
    /** @type {Number} */
    this.minRank = 0;
    /** @type {Number} */
    this.maxRank = 0;
    /** @type {String} */
    this.networkIDStr = cy.data('id');

    this.searchController = new SearchController(cy, this.bus);
    this.exportController = new ExportController(this);
    this.undoHandler = new UndoHandler(this);

    this.networkLoaded = false;

    this.bus.on('networkLoaded', (flags) => {
      this.networkLoaded = true;
      this.undoHandler.init();
      
      if(flags.layoutWasRun) {
        this.savePositions();
      }
    });

    window.cy = cy; // for access in the console
  }

  isNetworkLoaded() {
    return this.networkLoaded;
  }

  isGeneListIndexed() {
    return this.searchController.isGeneListIndexed();
  }

  isResultListIndexed() {
    return this.searchController.isResultListIndexed();
  }

  searchGenes(query) {
    return this.searchController.searchGenes(query);
  }

  searchResults(query) {
    return this.searchController.searchResults(query);
  }

  searchClusters(query) {
    return this.searchController.searchClusters(query);
  }

  isDemoNetwork() {
    return Boolean(this.cy.data('demo'));
  }

  updateNetwork(results, genes) {
    const cy = this.cy;
    cy.remove(cy.elements());
    this.addToNetwork(results, genes);
  }

  addToNetwork(results, genes) {
    const cy = this.cy;

    if (!genes && this.searchController.isGeneListIndexed()) {
      genes = this.searchController.getGenes();
    }
    const geneMap = new Map();
    if (genes) {
      genes.forEach(g => geneMap.set(g.name, g));
    }

    /** Get an existing node by its name or create one and return it */
    const getNode = (name, type, typeId, isQuery) => {
      let node = cy.getElementById(name);
      if (node.length === 0) {
        const gene = geneMap.get(name);
        if (isQuery && !gene.query) {
          return null;
        }
        let query = gene?.query;
        const data = {
          id: name,
          name,
          query,
          regulatoryFunction: 'unknown',
          motifs: gene.motifs,
          tracks: gene.tracks,
          source: []
        };
        node = cy.add({ group: 'nodes', data })[0];
      } else {
        node = node[0];
      }
      const sourceId = rowId(type, typeId);
      const source = node.data('source');
      if (!source.includes(sourceId)) {
        source.push(sourceId);
      }
      return node;
    };

    results.forEach(ele => {
      const type = ele.type;
      const typeId = ele[rowTypeIdField(type)];
      const clusterNumber = ele.clusterNumber;
      const tfArr = ele.transcriptionFactors;
      const tgtArr = ele.candidateTargetGenes;

      // Use only the first TF
      if (tfArr.length > 0) {
        const g1 = tfArr[0];
        const name1 = g1.geneID.name;
        console.log('map', geneMap.values());
        const node1 = getNode(name1, type, typeId, false); // A TF must be added even if it's not a query gene
        // Update the 'regulatoryFunction' data field
        node1.data('regulatoryFunction', 'regulator');

        tgtArr?.forEach((g2) => {
          const name2 = g2.geneID.name;
          const node2 = getNode(name2, type, typeId, true); // Use only the query genes for target nodes
          if (node2) {
            // Update the 'regulatoryFunction' data field, but only if it's not already set to 'regulator'
            if (node2.data('regulatoryFunction') !== 'regulator') {
              node2.data('regulatoryFunction', 'regulated');
            }
            // Add an edge between the TF and the target node
            cy.add({ group: 'edges', data: { source: name1, target: name2, clusterNumber } });
          }
        });
      }
    });
  }

  removeFromNetwork(results) {
    const cy = this.cy;

    results.forEach(ele => {
      const type = ele.type;
      const typeId = ele[rowTypeIdField(type)];
      const clusterId = rowId(type, typeId);
      const genesArr = [...ele.transcriptionFactors, ...ele.candidateTargetGenes];

      genesArr.forEach((g) => {
        const name = g.geneID.name;
        let node = cy.getElementById(name);
        if (node.length > 0) {
          node = node[0];
          const clusters = node.data('source');
          // Remove this cluster from the node's cluster list
          const idx = clusters.indexOf(clusterId);
          if (idx >= 0) {
            clusters.splice(idx, 1);
          }
          if (clusters.length === 0) {
            cy.remove(node);
          }
        }
      });
    });
  }

  _computeFCOSEidealEdgeLengthMap(clusterLabels, clusterAttr) {
    const idealLength = size => {
      switch(true) {
        case size < 10: return 40;
        case size < 20: return 75;
        case size < 30: return 120;
        case size < 40: return 180;
        default:        return 250;
      }
    };

    const edgeLengthMap = new Map();

    clusterLabels.forEach(({ clusterId }) => {
      const cluster = this.cy.elements(`node[${clusterAttr}="${clusterId}"]`);
      if(!cluster.empty()) {
        const ideal = idealLength(cluster.size());
        cluster.internalEdges().forEach(edge => {
          edgeLengthMap.set(edge.data('id'), ideal);
        });
      }
    });

    return edgeLengthMap;
  }


  async applyLayout(options) {
    const { cy } = this;

    await this._applyLayoutToEles(cy.elements(), options);
    cy.fit(DEFAULT_PADDING);
  }

  _partitionComponentsByNES(eles) {
    const components = eles.components(); // array of collections

    const pos = [], neg = [];
    components.forEach(comp => {
      const avgNES = this.getAverageNES(comp.nodes());
      (avgNES < 0 ? neg : pos).push(comp);
    });

    return [ pos, neg ]; 
  }

  /**
   * Stops the currently running layout, if there is one, and apply the new layout options.
   */
  async _applyLayoutToEles(eles, options) {
    if (this.layout) {
      this.layout.stop();
    }
    const { cy } = this;
    // unrestricted zoom, since the old restrictions may not apply if things have changed
    cy.minZoom(-1e50);
    cy.maxZoom(1e50);

    // const idealLengths = this._computeFCOSEidealEdgeLengthMap(clusterLabels, clusterAttr);

    // const options = {
    //   name: 'fcose',
    //   animate: false,
    //   // idealEdgeLength: edge => idealLengths.get(edge.data('id')) || 50,
    //   nodeRepulsion: 100000
    // };
    options = options || {
      name: 'breadthfirst',
      circle: true,
      // grid: true,
      // avoidOverlap: true,
      // nodeDimensionsIncludeLabels: true,
      // roots: eles.filter(n => n.data('regulatoryFunction') === 'regulator').map(n => n.id()),
    };
    // const options = {
    //   name: 'concentric',
    //   animate: true,
    //   concentric: (node) => {
    //      // return higher values to place nodes in levels towards the centre
    //     return node.data('regulatoryFunction') === 'regulator' ? 2 : 1;
    //   },
    // };

    const allNodes = eles.nodes();
    const disconnectedNodes = allNodes.filter(n => n.degree() === 0); // careful, our compound nodes have degree 0
    const connectedNodes = allNodes.not(disconnectedNodes);
    const networkWithoutDisconnectedNodes = eles.not(disconnectedNodes);
    const networkToLayout = networkWithoutDisconnectedNodes;

    // monkeyPatchMathRandom(); // just before the FD layout starts
    
    const start = performance.now();

    this.layout = networkToLayout.layout(options);
    const onStop = this.layout.promiseOn('layoutstop');
    this.layout.run();
    await onStop;

    const layoutDone = performance.now();
    console.log(`layout time: ${Math.round(layoutDone - start)}ms`);

    this._packComponents(networkToLayout);

    const packDone = performance.now();
    console.log(`packing time: ${Math.round(packDone - layoutDone)}ms`);

    // restoreMathRandom(); // after the FD layout is done

    const connectedBB = connectedNodes.boundingBox();
    // Style hasn't been applied yet, there are no labels. Filter out compound nodes.
    const nodeWidth = disconnectedNodes.filter(n => !n.isParent()).max(n => n.boundingBox().w).value; 
    const avoidOverlapPadding = 45;
    const cols = Math.floor(connectedBB.w / (nodeWidth + avoidOverlapPadding));

    const cmpByNES = (a, b) => b.data('NES') - a.data('NES'); // up then down

    disconnectedNodes.sort(cmpByNES).layout({
      name: 'grid',
      boundingBox: {
        x1: connectedBB.x1,
        x2: connectedBB.x2,
        y1: connectedBB.y2 + DEFAULT_PADDING * 3,
        y2: connectedBB.y2 + DEFAULT_PADDING + 10000
      },
      avoidOverlapPadding,
      cols,
      condense: true,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
      fit: false
    }).run();
  }


  _packComponents(eles) {
    const layoutNodes = [];

    eles.components().forEach((component, i) => {
      component.nodes().forEach(n => {
        const bb = n.layoutDimensions();

        layoutNodes.push({
          id: n.data('id'),
          cmptId: i,
          x: n.position('x'),
          y: n.position('y'),
          width:  bb.w,
          height: bb.h,
          isLocked: false
        });
      });
    });

    const options = {
      clientWidth:  400,
      clientHeight: 300,
      componentSpacing: 40 // default is 40
    };

    // updates the x,y fields of each layoutNode object
    this._separateComponents(layoutNodes, options);

    // can call applyPositions() because each 'layoutNode' has x, y and id fields.
    this.applyPositions(layoutNodes);
  }

  /**
   * From the cytoscape.js 'cose' layout.
   */
  _separateComponents(nodes, options) {
    const components = [];
  
    for(let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const cid = node.cmptId;
      const component = components[cid] = components[cid] || [];
      component.push(node);
    }
  
    let totalA = 0;
  
    for(let i = 0; i < components.length; i++) {
      const c = components[i];
      if(!c){ continue; }
  
      c.x1 =  Infinity;
      c.x2 = -Infinity;
      c.y1 =  Infinity;
      c.y2 = -Infinity;
  
      for(let j = 0; j < c.length; j++) {
        const n = c[j];
        c.x1 = Math.min( c.x1, n.x - n.width / 2 );
        c.x2 = Math.max( c.x2, n.x + n.width / 2 );
        c.y1 = Math.min( c.y1, n.y - n.height / 2 );
        c.y2 = Math.max( c.y2, n.y + n.height / 2 );
      }
  
      c.w = c.x2 - c.x1;
      c.h = c.y2 - c.y1;
      totalA += c.w * c.h;
    }
  
    components.sort((c1, c2) =>  c2.w * c2.h - c1.w * c1.h);
  
    let x = 0;
    let y = 0;
    let usedW = 0;
    let rowH = 0;
    const maxRowW = Math.sqrt(totalA) * options.clientWidth / options.clientHeight;
  
    for(let i = 0; i < components.length; i++) {
      const c = components[i];
      if(!c){ continue; }
  
      for(let j = 0; j < c.length; j++) {
        const n = c[j];
        if(!n.isLocked) {
          n.x += (x - c.x1);
          n.y += (y - c.y1);
        }
      }
  
      x += c.w + options.componentSpacing;
      usedW += c.w + options.componentSpacing;
      rowH = Math.max(rowH, c.h);
  
      if(usedW > maxRowW) {
        y += rowH + options.componentSpacing;
        x = 0;
        usedW = 0;
        rowH = 0;
      }
    }
  }


  fitAndSetZoomMinMax() {
    this.cy.fit(DEFAULT_PADDING);
    // now that we know the zoom level when the graph fits to screen, we can use restrictions
    this.cy.minZoom(this.cy.zoom() * 0.25);
    this.cy.maxZoom(2);
  }
  

  async savePositions() {
    // TODO
    // console.log("saving positions...");

    // Deleted nodes are not present in the 'positions' document
    // const positions = this.cy.nodes()
    //   .map(node => ({ 
    //     id: node.data('id'),
    //     x:  node.position().x,
    //     y:  node.position().y,
    //     collapsed: node.data('collapsed')
    //   }));

    // const res = await fetch(`/api/${this.networkIDStr}/positions`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     positions
    //   })
    // });

    // if(res.ok) {
    //   console.log("positions saved");
    // } 
  }

  renameNetwork(newName) {
    const networkName = newName != null ? newName.trim() : null;
    this.cy.data({ name: networkName });
  
    fetch(`/api/${this.networkIDStr}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ networkName })
    });
  }

  async restoreNetwork() {
    const res = await fetch(`/api/${this.networkIDStr}/positions`, {
      method: 'DELETE',
    });
    if(res.ok) {
      location.reload();
    }
  }


  highlightElements(nodes, highlightNeighbors) {
    let toHl = this.cy.nodes().add(this.cy.edges());
    let toUnhl = this.cy.collection();

    const highlight = (eles) => {
      toHl = toHl.add(eles);
      toUnhl = toUnhl.not(eles);
    };
    const unhighlight = (eles) => {
      toHl = toHl.not(eles);
      toUnhl = toUnhl.add(eles);
    };
    const normlight = (eles) => {
      toUnhl = toUnhl.not(eles);
    };

    this.cy.batch(() => {
      let initted = false;
      
      const initAllUnhighlighted = () => {
        if (initted) {
          return;
        }
        unhighlight(this.cy.elements());
        initted = true;
      };

      if (nodes && nodes.length > 0) {
        initAllUnhighlighted();
        highlight(nodes);
        if (highlightNeighbors) {
          normlight(nodes.neighborhood());
        } else {
          normlight(nodes.edgesWith(nodes));
        }
      }

      // Apply highlights
      const eles = this.cy.elements();
      eles.not(toHl).removeClass('highlighted');
      eles.not(toUnhl).removeClass('unhighlighted');
      toHl.removeClass('unhighlighted');
      toHl.not(this.cy.nodes(':compound')).addClass('highlighted');
      toUnhl.removeClass('highlighted');
      toUnhl.not(this.cy.nodes(':compound')).addClass('unhighlighted');
    });
  }


  unhighlightAllElements() {
    const eles = this.cy.elements();
    eles.removeClass('highlighted');
    eles.addClass('unhighlighted');
  }


  clearElementsHighlights() {
    const eles = this.cy.elements();
    eles.removeClass('highlighted');
    eles.removeClass('unhighlighted');
  }


  /**
   * positions is an array of objects of the form...
   * [ { id: "node-id", x:1.2, y:3.4 }, ...]
   * 
   * Returns a Map object of nodeID -> position object
   */
  applyPositions(positions) {
    const positionsMap = new Map(positions.map((obj) => [obj.id, obj]));
    this.cy.nodes().positions(node => positionsMap.get(node.data('id')));
    return positionsMap;
  }


  getAverageNES(nodes) {
    let nes = 0;
    nodes.forEach(node => {
      nes += node.data('NES');
    });
    return _.round(nes / nodes.length, 4);
  }

  _setAverageNES(parent) {
    const nes = this.getAverageNES(parent.children());
    parent.data('NES', nes); 
    return nes;
  }


  /**
   * Delete the selected (i.e. :selected) elements in the graph
   */
  deleteSelectedNodes() {
    let selectedNodes = this.cy.nodes(':selected');
    selectedNodes = selectedNodes.filter(n => n.children().empty()); // Filter out parent nodes
    if (!selectedNodes.empty()) {
      const deletedNodes = selectedNodes.remove();
      this.bus.emit('deletedSelectedNodes', deletedNodes);
    }
  }


  /**
   * @param {boolean} isQuery if `true`, the returned list will contain only query genes
   */
  fetchGeneList(isQuery) {
    return this.searchController.getGenes(isQuery);
  }

  fetchResults(type) {
    return this.searchController.getResults(type);
  }

  fetchGene(name) {
    const genes = this.searchController.searchGenes(name);
    return genes.length > 0 ? genes[0] : null;
  }
}
