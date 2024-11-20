import _ from 'lodash';
import chroma from 'chroma-js';


export const NODE_COLOR_DEFAULT = '#d5d5d5';
export const NODE_COLOR_REGULATOR = '#9555ab';
export const NODE_COLOR_REGULATED = '#5275ab';
export const SELECTED_BORDER_COLOR = '#121212';
export const TEXT_COLOR = '#ffffff';
export const NODE_OPACITY = 1.0;
export const TEXT_OPACITY = 1.0;
export const BORDER_WIDTH = 8;
export const SELECTED_BORDER_WIDTH = 8;


const CLUSTER_COLORS = [
  0x51CC8C, 0x51CCCC, 0x337F7F, 0x8ECC51, 0x597F33, 0x8E51CC, 0xCCAD51, 0x7F6C33,
  0x51CC70, 0x337F46, 0x5170CC, 0xCC51AD, 0x7F336C, 0xCC7F51, 0x7F4F33, 0xCC5151,
  0xBCCC51, 0x757F33, 0x60CC51, 0x3C7F33, 0x51CC9E, 0x337F62, 0x519ECC, 0x33627F,
  0x6051CC, 0xBC51CC, 0xCC517F, 0xCC6851, 0xCC9651, 0x7F5E33, 0xCCC451, 0x7F7A33,
  0xA5CC51, 0x677F33, 0x77CC51, 0x4A7F33, 0x337F37, 0x51CC87, 0x337F54, 0x51CCB5,
  0x337F71, 0x51B5CC, 0x33717F, 0x5187CC, 0x33547F, 0x5159CC, 0x7751CC, 0xA551CC,
  0xCC51C4, 0x7F337A, 0xCC5196, 0xCC5168, 0xCC5D51, 0x7F3A33, 0xCC7451, 0x7F4833,
  0xCC8A51, 0xCCB851, 0x9ACC51, 0x55CC51, 0x51CC92, 0x51C0CC, 0x517BCC, 0x6C51CC,
  0xB151CC, 0xCC51A1, 0xCC515D, 0xCC6E51, 0xCC9051, 0xCCB351, 0xC2CC51, 0xA0CC51,
  0x7DCC51, 0x5BCC51, 0x51C6CC, 0x51A3CC, 0x7F335E, 0x7F3341
];

function getMinMaxValues(cy, attr) {
  return {
    min: cy.nodes().min(n => n.data(attr)).value,
    max: cy.nodes().max(n => n.data(attr)).value
  };
}

// Node memoize functions

const getNodeLabel = _.memoize(node => {
  const label = node.data('label');
  if (label)
    return label;
  const name = node.data('name');
  return name;
}, node => node.id());

const getNodeColor = _.memoize(node => {
  const regFunction = node.data('regulatoryFunction');
  // const query = node.data('query');
  // if (query) return '#666666';
  switch (regFunction) {
    case 'regulator': return NODE_COLOR_REGULATOR;
    case 'regulated': return NODE_COLOR_REGULATED;
    default:          return NODE_COLOR_DEFAULT;
  }
}, n => n.id());

const getNodeShape = _.memoize(n => {
  return n.data('regulatoryFunction') === 'regulator' ? 'ellipse' : 'ellipse';
}, n => n.id());

const getNodeSize = _.memoize(n => {
  return n.data('regulatoryFunction') === 'regulator' ? 60 : 40;
}, n => n.id());

const getNodeFontSize = _.memoize(n => {
  return n.data('regulatoryFunction') === 'regulator' ? '16px' : '10px';
}, n => n.id());

const getTextOutlineWidth = _.memoize(n => {
  return n.data('regulatoryFunction') === 'regulator' ? 3 : 2;
}, n => n.id());

// Edge memoize functions

const getEdgeColor = _.memoize(e => {
  const cluster = e.data('clusterNumber');
  return clusterColor(cluster);
}, e => e.id());

// So we can update all memoize functions when necessary
const memoizeFunctions = [
  getNodeLabel,
  getNodeColor,
  getNodeShape,
  getNodeSize,
  getNodeFontSize,
  getTextOutlineWidth,
  getEdgeColor,
];


export function clusterColor(clusterNumber) {
  const colorNumber = clusterNumber % CLUSTER_COLORS.length;
  const color = chroma(CLUSTER_COLORS[colorNumber]);
  return color.hex();
}

export function updateNetworkStyle() {
  memoizeFunctions?.forEach(f => f.cache.clear());
}

export function createNetworkStyle(cy) {
  const { min:minNES, max:maxNES } = getMinMaxValues(cy, 'NES');
  const magNES = Math.max(Math.abs(maxNES), Math.abs(minNES));

  return {
    maxNES,
    minNES,
    magNES,
    getNodeColor,
    getNodeShape,
    getEdgeColor,
    cyJSON: [
      {
        selector: 'node',
        style: {
          'opacity': NODE_OPACITY,
          'border-width': BORDER_WIDTH,
          'border-opacity': 0,
          'width':  getNodeSize,
          'height': getNodeSize,
          'font-size': getNodeFontSize,
          'text-valign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 80,
          'text-outline-width': getTextOutlineWidth,
          'text-outline-opacity': TEXT_OPACITY,
          'color': TEXT_COLOR,
          'background-color':   getNodeColor,
          'text-outline-color': getNodeColor,
          'shape': getNodeShape,
          'z-index': 1,
          'label': getNodeLabel,
        }
      },
      {
        selector: 'node:active',
        style: {
          'overlay-opacity': 0.25
        }
      },
      {
        selector: 'node.grabbing-collapsed-child',
        style: {
          'overlay-opacity': 0.25
        }
      },
      {
        selector: 'node.box-select-enabled',
        style: {
          'events': 'yes'
        }
      },
      {
        selector: 'edge',
        style: {
          'line-color' : getEdgeColor,
          'line-opacity': 0.3,
          'curve-style': 'bezier',
          'width': 2,
          'target-arrow-shape': 'triangle',
          'target-arrow-color': getEdgeColor,
          'z-index': 1,
          'z-index-compare': 'manual'
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': SELECTED_BORDER_WIDTH,
          'border-color': SELECTED_BORDER_COLOR,
          'border-opacity': 1.0,
          'text-outline-color': SELECTED_BORDER_COLOR,
          'z-index': 99999999,
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': SELECTED_BORDER_COLOR,
          'line-opacity': 1.0,
          'z-index': 9999999,
        }
      },
      {
        selector: 'node.unhighlighted',
        style: {
          'opacity': 0.1,
          'label': '',
          'z-index': 1,
        }
      },
      {
        selector: 'edge.unhighlighted',
        style: {
          'line-opacity': 0.0,
          'z-index': 1,
        }
      },
      {
        selector: '.highlighted',
        style: {
          'z-index': 999999,
        }
      },
    ]
  };
}

export default createNetworkStyle;