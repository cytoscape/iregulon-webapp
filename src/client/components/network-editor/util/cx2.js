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
      "iRegulonWebID": { "d": "string" },
      "name": { "d": "string" },
      "description": { "d": "string" },
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

  const networkAttributes = [{
    "iRegulonWebID": networkJson.data.id,
    "name": networkJson.data.name,
    "description": Object.entries(networkJson.data.parameters)?.map(([k, v]) => `<p>${k}: ${v}</p>`).join(''),
  }];

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
  let defaultNodeVisualProperties = {
    "NODE_BACKGROUND_OPACITY": 1,
    "NODE_SHAPE": "ellipse",
    "NODE_BORDER_COLOR": "#ffffff",
    "NODE_BORDER_STYLE": "solid",
    "NODE_BORDER_OPACITY": 1.0,
    "NODE_BORDER_WIDTH": 8,
    "NODE_BACKGROUND_COLOR": "#cccccc",
    "NODE_HEIGHT": 40,
    "NODE_LABEL": "",
    "NODE_LABEL_COLOR": "#000000",
    "NODE_LABEL_FONT_FACE": {
      "FONT_FAMILY": "sans-serif",
      "FONT_STYLE": "normal",
      "FONT_WEIGHT": "normal"
    },
    "NODE_LABEL_FONT_SIZE": 10,
    "NODE_LABEL_OPACITY": 1,
    "NODE_LABEL_POSITION": {
      "HORIZONTAL_ALIGN": "center",
      "VERTICAL_ALIGN": "center",
      "HORIZONTAL_ANCHOR": "center",
      "VERTICAL_ANCHOR": "center",
      "JUSTIFICATION": "center",
      "MARGIN_X": 0,
      "MARGIN_Y": 0
    },
    "NODE_LABEL_MAX_WIDTH": 80,
    "nodeSizeLocked": true,
  };
  let defaultEdgeVisualProperties = {
    "EDGE_LABEL_COLOR": "#000000",
    "EDGE_LABEL_FONT_FACE": {
      "FONT_FAMILY": "sans-serif",
      "FONT_STYLE": "normal",
      "FONT_WEIGHT": "normal"
    },
    "EDGE_LABEL_FONT_SIZE": 12,
    "EDGE_LABEL_OPACITY": 1,
    "EDGE_LABEL_ROTATION": 0,
    "EDGE_LABEL_MAX_WIDTH": 100,
    "EDGE_LINE_COLOR": "#666666",
    "EDGE_LINE_STYLE": "solid",
    "EDGE_OPACITY": 0.3,
    "EDGE_SOURCE_ARROW_COLOR": "#666666",
    "EDGE_SOURCE_ARROW_SHAPE": "none",
    "EDGE_TARGET_ARROW_COLOR": "#666666",
    "EDGE_TARGET_ARROW_SHAPE": "triangle",
    "EDGE_VISIBILITY": "element",
    "EDGE_WIDTH": 2,
    "EDGE_Z_LOCATION": 0,
  };

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
