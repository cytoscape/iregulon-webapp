const queryParametersDef = {
  "AUCThreshold": { "d": "double" },
  "NESThreshold": { "d": "double" },
  "SpeciesNomenclature": { "d": "integer" },
  "conversionDelineation": { "d": "string" },
  "conversionFractionOfOverlap": { "d": "double" },
  "genes": { "d": "string" },
  "maxMotifSimilarityFDR": { "d": "double" },
  "minOrthologous": { "d": "double" },
  "rankThreshold": { "d": "integer" },
  "selectedMotifRankingsDatabase": { "d": "string" },
  "selectedTrackRankingsDatabase": { "d": "string" },
};

// Map the node/edge `selector` properties from the Cytoscape JSON to the CX2 format
// (this is a simplified mapping, and does not cover all cases)
const cyToCx2NodeMapping = {
  "NODE_BACKGROUND_COLOR": "background-color",
  "NODE_BORDER_COLOR": "border-color",
  "NODE_BORDER_WIDTH": "border-width",
  "NODE_BORDER_STYLE": "border-style",
  "NODE_BORDER_OPACITY": "border-opacity",
  "NODE_LABEL_COLOR": "color",
  "NODE_LABEL_FONT_SIZE": "font-size",
  "NODE_LABEL_OPACITY": "text-opacity",
  "NODE_BACKGROUND_OPACITY": "background-opacity",
  "NODE_OPACITY": "opacity",
  "NODE_SHAPE": "shape",
  "NODE_HEIGHT": "height",
  "NODE_WIDTH": "width",
};
const cyToCx2EdgeMapping = {
  "EDGE_LINE_COLOR": "line-color",
  "EDGE_OPACITY": "line-opacity",
  "EDGE_LINE_STYLE": "line-style",
  "EDGE_WIDTH": "width",
  "EDGE_SOURCE_ARROW_COLOR": "source-arrow-color",
  "EDGE_SOURCE_ARROW_SHAPE": "source-arrow-shape",
  "EDGE_TARGET_ARROW_COLOR": "target-arrow-color",
  "EDGE_TARGET_ARROW_SHAPE": "target-arrow-shape",
};


/**
 * @param {*} networkJson 
 * @param {*} positions 
 * @param {*} visualStyle optional visual style object (already in CX2 format)
 * @returns The CX2 network as an array of objects.
 */
export function cyJsonToCx2(networkJson, positions, visualStyle) {
  const cyNodes = networkJson.elements.nodes;
  const cyEdges = networkJson.elements.edges;

  const positionsMap = positions?.reduce((map, pos) => {
    const { id, x, y } = pos;
    map.set(id, { x, y });
    return map;
  }, new Map());

  const nodeIDMap = cyNodes.reduce((map, node, i) => {
    const id = node.data.id;
    map.set(id, i);
    return map;
  }, new Map());

  const metaData = [
    { name: "attributeDeclarations", elementCount: 1 }, 
    { name: "networkAttributes", elementCount: 1 }, 
    { name: "nodes", elementCount: cyNodes.length }, 
    { name: "edges", elementCount: cyEdges.length }, 
    { name: "visualProperties", elementCount: 1 }, 
    { name: "nodeBypasses", elementCount: 0 }, 
    { name: "edgeBypasses", elementCount: 0 }, 
    { name: "visualEditorProperties", elementCount: 1 }
  ];

  const attributeDeclarations = [{
    networkAttributes: {
      "name": { "d": "string" },
      "description": { "d": "string" },
      "permalink": { "d": "string" },
      ...queryParametersDef,
    },
    nodes: {
      "name": { "d": "string" },
      "query": { "d": "boolean" },
      "regulatoryFunction": { "d": "string" },
      "motifs": { "d": "list_of_string" },
      "tracks": { "d": "list_of_string" },
    },
    edges: {
      "name": { "d": "string" },
      "clusterNumber": { "d": "integer" },
    }
  }];

  const link = window.location.href;

  const networkAttributes = [{
    "name": networkJson.data.name,
    "description": `Network exported by <a href="${link}" target="_blank">iRegulon Web</a>.`,
    "permalink": link,
  }];
  // Add the query parameters
  Object.entries(queryParametersDef).forEach(([ key, ]) => {
    networkAttributes[0][key] = networkJson.data.parameters[key];
  });

  const nodes = cyNodes.map(node => {
    const { data } = node;
    const id = nodeIDMap.get(data.id);
    const { x, y } = positionsMap?.get(data.id) || { x: 0, y: 0 };
    return {
      id,
      x, y,
      v: {
        "name": data.name,
        "query": data.query,
        "regulatoryFunction": data.regulatoryFunction,
        "motifs": data.motifs,
        "tracks": data.tracks,
      }
    };
  });

  const edges = cyEdges.map((edge, index) => {
    const { data } = edge;
    const edgeID = index + cyNodes.length + 1; // not sure of edge IDs can overlap with node IDs
    const sourceID = nodeIDMap.get(data.source);
    const targetID = nodeIDMap.get(data.target);
    return {
      id: edgeID,
      s: sourceID,
      t: targetID,
      v: {
        "name": data.id,
        "clusterNumber": data.clusterNumber,
      }
    };
  });

  // Default visual properties
  let defaultNetworkVisualProperties = {
    "NETWORK_BACKGROUND_COLOR": "#ffffff"
  };
  let defaultNodeVisualProperties = toCx2VisualProperties(networkJson, 'node', cyToCx2NodeMapping);
  let defaultEdgeVisualProperties = toCx2VisualProperties(networkJson, 'edge', cyToCx2EdgeMapping);

  let nodeMapping = {
    "NODE_LABEL": {
      "type": "PASSTHROUGH",
      "definition": {
        "attribute": "name"
      }
    },
  };
  let edgeMapping = {
    // No default edge mappings for now...
  };

  // Merge with the passed `visualStyle` properties
  if (visualStyle?.default?.network) {
    defaultNetworkVisualProperties = {
      ...defaultNetworkVisualProperties,
      ...visualStyle.default.network
    };
  }
  if (visualStyle?.default?.node) {
    defaultNodeVisualProperties = {
      ...defaultNodeVisualProperties,
      ...visualStyle.default.node
    };
  }
  if (visualStyle?.default?.edge) {
    defaultEdgeVisualProperties = {
      ...defaultEdgeVisualProperties,
      ...visualStyle.default.edge
    };
  }
  if (visualStyle?.nodeMapping) {
    nodeMapping = {
      ...nodeMapping,
      ...visualStyle.nodeMapping
    };
  }
  if (visualStyle?.edgeMapping) {
    edgeMapping = {
      ...edgeMapping,
      ...visualStyle.edgeMapping
    };
  }

  const visualProperties = [{
    "default": {
      "network": defaultNetworkVisualProperties,
      "node": defaultNodeVisualProperties,
      "edge": defaultEdgeVisualProperties,
    },
    nodeMapping,
    edgeMapping,
  }];

  const status = [{
    error: "",
    success: true
  }];

  return [
    {
      "CXVersion": "2.0",
      "hasFragments": false
    },
    { metaData },
    { attributeDeclarations },
    { networkAttributes },
    { nodes },
    { edges },
    { visualProperties },
    { status }
  ];
}

function toCx2VisualProperties(networkJson, selector, mapping) {
  const defaultVisualProperties = {};
  const styleJson = networkJson.style.find(style => style.selector === selector);
  if (styleJson) {
    Object.entries(mapping).forEach(([ cx2Key, cyKey ]) => {
      let value = styleJson.style[cyKey];
      if (value && value !== 'fn') { // ignore functions
        // Remove the 'px' suffix from width, height and size values
        if (cyKey.endsWith('width') || cyKey.endsWith('height') || cyKey.endsWith('size') || cyKey.endsWith('opacity')) {
            if (typeof value === 'string' && value.endsWith('px')) {
              value = value.slice(0, -2);
            }
            value = parseFloat(value);
        }
        defaultVisualProperties[cx2Key] = value;
      }
    });
  }
  return defaultVisualProperties;
}
