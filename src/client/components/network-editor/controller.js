import EventEmitter from 'eventemitter3';
import Cytoscape from 'cytoscape'; // eslint-disable-line
import _ from 'lodash';

import { DEFAULT_PADDING } from '../defaults';
import { monkeyPatchMathRandom, restoreMathRandom } from '../../rng';
import { SearchController } from './search-controller';
import { ExportController } from './export-controller';
import { UndoHandler } from './undo-stack';
import { useUIStateStore, stateToJson } from './store';
import { createCX2Style } from './util/cx2-style';
import { cyJsonToCx2 } from './util/cx2';
import { speciesNomenclatureDef } from '../../../util';


export const DEFAULT_LAYOUT_OPTIONS = {
  name: 'euler',
  animate: false,
  mass: (n) => n.data('regulatoryFunction') === 'regulator' ? 480 : 12,
  springLength: 120,
};


/**
 * The network editor controller contains all high-level model operations that the network
 * editor view can perform.
 *
 * @property {Cytoscape.Core} cy The graph instance
 * @property {EventEmitter} bus The event bus that the controller emits on after every operation
 * @property {String} resultsIDStr The results UUID
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
    /** @type {String} */
    this.resultsIDStr = cy.data('id');

    this.searchController = new SearchController(cy, this.bus);
    this.exportController = new ExportController(this);
    this.undoHandler = new UndoHandler(this);

    this.networkLoaded = false;

    this.bus.on('networkLoaded', () => {
      this.networkLoaded = true;
      this.undoHandler.init();
    });

    window.cy = cy; // for access in the console
  }

  initializeResults(resultsJson) {
    this.searchController.initializeResults(resultsJson);
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

  getResultOrClusterById(id) {
    return id.startsWith('CLUSTER') ? this.searchController.getClusterById(id) : this.searchController.getResultById(id);
  }

  /**
   * @param {*} results Array of motifs/tracks/clusters with the 'transcriptionFactors' that must be added to the network.
   * @returns {Collection} Cytoscape collection of elements that were added to the network.
   */
  addToNetwork(results) {
    const cy = this.cy;

    const geneMap = new Map();
    if (this.searchController.isGeneListIndexed()) {
      const genes  = this.fetchGeneList();
      genes.forEach(g => geneMap.set(g.name, g));
    }

    /** Get an existing node by its name or create one and return it. Either way, it also updates the `resultIds` attribute */
    const createOrUpdateNode = (name, resId, regulatoryFunction, isQuery) => {
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
          regulatoryFunction,
          motifs: gene.motifs,
          tracks: gene.tracks,
          resultIds: [],
        };
        node = cy.add({ group: 'nodes', data })[0];
        node.scratch('_new', true);
        node.scratch('_isQuery', isQuery);
      } else {
        node = node[0];
      }
      if (regulatoryFunction === 'regulator') {
        // Force the node to be a regulator
        node.data('regulatoryFunction', 'regulator');
        // Add the result ID to the node's `resultIds` list
        const resultIds = node.data('resultIds');
        if (!resultIds.includes(resId)) {
          resultIds.push(resId);
        }
      }
      return node;
    };

    results.forEach(ele => {
      const resId = ele.id;
      const clusterNumber = ele.clusterNumber;
      const tfArr = ele.transcriptionFactors;
      const tgtArr = ele.candidateTargetGenes;

      if (tfArr.length > 0) {
        tfArr.forEach((g1) => {
          // TF ('regulator') node
          const name1 = g1.geneID.name; // TF name
          createOrUpdateNode(name1, resId, 'regulator', false); // A TF must be added even if it's not a query gene
          // Target ('regulated') nodes
          tgtArr?.forEach((g2) => {
            const name2 = g2.geneID.name;
            const node2 = createOrUpdateNode(name2, resId, 'regulated', true); // Use only the query genes for target nodes
            if (node2) {
              // Add an edge between the TF and the target node (prevent duplicate edges by checking the `resultTFId` attribute)
              const edge = cy.elements(`edge[source="${name1}"][target="${name2}"][resultTFId="${resId}::${name1}"]`);
              if (edge.length === 0) {
                const data = {
                  id: `${name1}::${resId}::${name2}`,
                  source: name1,
                  target: name2,
                  clusterNumber,
                  resultTFId: resId + '::' + name1,
                };
                const edge = cy.add({ group: 'edges', data });
                edge.scratch('_new', true);
              }
            }
          });
        });
      }
    });

    const newElements = cy.elements().filter(e => e.scratch('_new'));
    newElements.removeScratch('_new');

    return newElements;
  }

  removeFromNetwork(results) {
    const cy = this.cy;

    results.forEach(ele => {
      const resId = ele.id;

      // 1: Maybe remove TF nodes and their edges
      ele.transcriptionFactors?.forEach((g) => {
        const name = g.geneID.name;
        let node = cy.getElementById(name);
        if (node.length > 0) {
          node = node[0];
          const resultIds = node.data('resultIds');
          // Remove this cluster from the node's `resultIds` list
          const idx = resultIds.indexOf(resId);
          if (idx >= 0) {
            resultIds.splice(idx, 1);
          }
          // Then remove the node if it has: a) no more `resultIds`, and b) no incoming edges--a regulator can also be regulated by another TF
          if (resultIds.length === 0 && node.indegree(false) === 0) {
            cy.remove(node); // Will remove the node and its edges
          } else {
            // If the TF node has not been removed because it has incoming edges, we need to update its 'regulatoryFunction'
            if (resultIds.length === 0 && node.indegree(false) > 0) {
              node.data('regulatoryFunction', 'regulated');
            }
            // If the TF node has not been removed, we need to remove the edges that have this "result Id" + "TF name" combination
            cy.elements(`edge[resultTFId="${resId}::${name}"]`).remove();
          }
        }
      });
      // 2: Remove all isolated (probably 'target') nodes
      cy.nodes('[[degree = 0]]').remove();
    });
  }

  async applyLayout(eles, options) {
    const { cy } = this;

    let otherEles;
    if (eles && eles.length > 0) {
      otherEles = cy.nodes().difference(eles.nodes());
      otherEles.lock();
    }

    await this._applyLayoutToEles(cy.elements(), options || DEFAULT_LAYOUT_OPTIONS);
    cy.fit(DEFAULT_PADDING);

    otherEles?.unlock();
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
  

  async savePositionsAndState() {
    if (this.cy.isDemo()) {
      console.log('Demo network, not saving positions!');
      return;
    }
    console.log("saving positions and UI state...");

    const positions = this.getPositions();
    const state = useUIStateStore.getState();
    const stateJson = stateToJson(state);

    const body = {
      positions,
      state: stateJson
    };

    const res = await fetch(`/api/${this.resultsIDStr}/uistate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if(res.ok) {
      console.log("positions saved");
    } 
  }
  

  renameNetwork(newName) {
    const networkName = newName != null ? newName.trim() : null;
    this.cy.data({ name: networkName });
  
    fetch(`/api/${this.resultsIDStr}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: networkName })
    });
  }

  async restoreNetwork() {
    const res = await fetch(`/api/${this.resultsIDStr}/positions`, {
      method: 'DELETE',
    });
    if(res.ok) {
      location.reload();
    }
  }


  async saveExportedNetwork() {
    if (this.cy.isDemo()) {
      console.log('Demo network, not saving network snapshot!');
      return;
    }

    const resultsID = this.cy.data('id');
    // Convert the network to CX2 format (must include the node positions)
    const positions = this.getPositions();
    const cx2 = cyJsonToCx2(this.cy.json(), positions, createCX2Style(this.cy));

    const body = { network: cx2 };
    const res = await fetch(`/api/${resultsID}/cx2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (res.ok) {
      const { networkID } = await res.json();
      console.log('Exported network snapshot saved:', networkID);
      return networkID;
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


  getPositions() {
    return this.cy.nodes()
      .map(node => ({ 
        id: node.data('id'),
        x:  node.position().x,
        y:  node.position().y,
      })
    );
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


  // /**
  //  * Delete the selected (i.e. :selected) elements in the graph
  //  */
  // deleteSelectedNodes() {
  //   let selectedNodes = this.cy.nodes(':selected');
  //   selectedNodes = selectedNodes.filter(n => n.children().empty()); // Filter out parent nodes
  //   if (!selectedNodes.empty()) {
  //     const deletedNodes = selectedNodes.remove();
  //     this.bus.emit('deletedSelectedNodes', deletedNodes);
  //   }
  // }

  /**
   * @param {boolean} isQuery if `true`, the returned list will contain only query genes
   */
  fetchGeneList(isQuery) {
    return this.searchController.getGenes(isQuery);
  }

  fetchRegulatorGeneList() {
    return this.searchController.getRegulatorGenes();
  }

  fetchResults(type) {
    return this.searchController.getResults(type);
  }

  getAssembly() {
    const parameters = this.cy?.data('parameters');
    const nomenclatureCode = parameters?.SpeciesNomenclature;
    if (nomenclatureCode) {
      const species = Object.values(speciesNomenclatureDef).find(obj => obj.nomenclatureCode === nomenclatureCode);
      return species?.assembly;
    }
  }

  countResults(type) {
    return this.searchController.countResults(type);
  }

  fetchGene(name) {
    const genes = this.searchController.searchGenes(name);
    return genes.length > 0 ? genes[0] : null;
  }
}
