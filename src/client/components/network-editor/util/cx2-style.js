import * as Style from './network-style';

/**
 * Converts a Cytoscape.js style to a CX2 style.
 */
export function createCX2Style(cy) {
  // Node Mappings:
  const nodeSizeMapping = {
    "type": "DISCRETE",
    "definition": {
      "attribute": "regulatoryFunction",
      "map": [{
        "v": "regulator",
        "vp": Style.NODE_SIZE_REGULATOR,
      }, {
        "v": "regulated",
        "vp": Style.NODE_SIZE_REGULATED,
      }]
    }
  };

  // Edge Mappings:
  // Get The line colours for the edges distinct cluster numbers
  const distinctClusters = cy.edges().map(edge => edge.data('clusterNumber')).filter((value, index, self) => self.indexOf(value) === index);
  const colorMap = distinctClusters.map(clusterNumber => ({
    "v": clusterNumber,
    "vp": Style.clusterColor(clusterNumber),
  }));
  const edgeLineColorMapping = {
    "type": "DISCRETE",
    "definition": {
      "attribute": "clusterNumber",
      "map": colorMap,
    }
  };


  // Default visual properties
  let defaultNetworkVisualProperties = {
    "NETWORK_BACKGROUND_COLOR": Style.NETWORK_BACKGROUND_COLOR,
  };
  let defaultNodeVisualProperties = {
    "NODE_BACKGROUND_COLOR": Style.NODE_COLOR,
    "NODE_HEIGHT": Style.NODE_SIZE_REGULATED,
    "NODE_WIDTH": Style.NODE_SIZE_REGULATED,
    "NODE_LABEL_COLOR": "#333333", // Don't use our default 'white' if the background is also white, because Cytoscape Web does not support text-outline and
    "NODE_LABEL_FONT_SIZE": Style.NODE_LABEL_FONT_SIZE_REGULATED,
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
    // Add our edge visual properties here, if necessary...
  };

  // Visual property mappings
  let nodeMapping = {
    "NODE_WIDTH": nodeSizeMapping,
    "NODE_HEIGHT": nodeSizeMapping,
    "NODE_BACKGROUND_COLOR": {
      "type": "DISCRETE",
      "definition": {
        "attribute": "regulatoryFunction",
        "map": [{
          "v": "regulator",
          "vp": Style.NODE_COLOR_REGULATOR,
        }, {
          "v": "regulated",
          "vp": Style.NODE_COLOR_REGULATED,
        }]
      }
    },
    "NODE_LABEL_FONT_SIZE": {
      "type": "DISCRETE",
      "definition": {
        "attribute": "regulatoryFunction",
        "map": [{
          "v": "regulator",
          "vp": Style.NODE_LABEL_FONT_SIZE_REGULATOR,
        }, {
          "v": "regulated",
          "vp": Style.NODE_LABEL_FONT_SIZE_REGULATED,
        }]
      }
    },
  };
  let edgeMapping = {
    "EDGE_LINE_COLOR": edgeLineColorMapping,
    "EDGE_TARGET_ARROW_COLOR": edgeLineColorMapping,
  };

  return {
    "default": {
      "network": defaultNetworkVisualProperties,
      "node": defaultNodeVisualProperties,
      "edge": defaultEdgeVisualProperties,
    },
    nodeMapping,
    edgeMapping,
  };
}