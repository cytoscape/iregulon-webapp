import _ from 'lodash';
import chroma from 'chroma-js';

export const NODE_COLOR_DEFAULT = '#d5d5d5';
export const NODE_COLOR_REGULATOR = '#9d56b4';
export const NODE_COLOR_REGULATED = '#3a88fe';
export const NODE_OPACITY = 1;
export const TEXT_OPACITY = 1;
export const SELECTED_BORDER_COLOR = '#333333';

/** Color range for up-down regulation. */
export const REG_COLOR_RANGE = (() => {
  // ColorBrewer 2.0 -- Diverging (Colorblind Safe)
  // IMPORTANT: Use only hex format, do NOT use 'rgb()'!
  const colors = ['#0571b0', '#92c5de', '#f7f7f7', '#f4a582', '#ca0020']; // 5-class RdBu: https://colorbrewer2.org/#type=diverging&scheme=RdBu&n=5
  // const colors = ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']; // 5-class RdYlBu: https://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=5
  // const colors = ['#5e3c99', '#b2abd2', '#f7f7f7', '#fdb863', '#e66101']; // 5-class PuOr: https://colorbrewer2.org/#type=diverging&scheme=PuOr&n=5
  // const colors = ['#008837', '#a6dba0', '#f7f7f7', '#c2a5cf', '#7b3294']; // 5-class PRGn: // https://colorbrewer2.org/#type=diverging&scheme=PRGn&n=5
  // const colors = ['#4dac26', '#b8e186', '#f7f7f7', '#f1b6da', '#d01c8b']; // 5-class PiYG: https://colorbrewer2.org/#type=diverging&scheme=PiYG&n=5
  // const colors = ['#018571', '#80cdc1', '#f5f5f5', '#dfc27d', '#a6611a']; // 5-class BrBG: https://colorbrewer2.org/#type=diverging&scheme=BrBG&n=5
  const downMax = colors[0];
  const down = colors[1];
  const zero = colors[2];
  const up = colors[3];
  const upMax = colors[4];
  const range3 = [ downMax, zero, upMax ];
  const range5 = colors;
  return { downMax, down, zero, up, upMax, range3, range5 };
})();

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

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getMinMaxValues(cy, attr) {
  return {
    min: cy.nodes().min(n => n.data(attr)).value,
    max: cy.nodes().max(n => n.data(attr)).value
  };
}


export const nodeLabel = _.memoize(node => {
  const label = node.data('label');
  if (label)
    return label;
  const name = node.data('name');
  return name;
}, node => node.id());


export const createNetworkStyle = (cy) => {
  const { min:minNES, max:maxNES } = getMinMaxValues(cy, 'NES');
  const magNES = Math.max(Math.abs(maxNES), Math.abs(minNES));

  const getNodeColor = _.memoize(node => {
    const regFunction = node.data('regulatoryFunction');
    // const query = node.data('query');
    // if (query) return '#666666';
    switch (regFunction) {
      case 'regulator': return NODE_COLOR_REGULATOR;
      case 'regulated': return NODE_COLOR_REGULATED;
      default:          return NODE_COLOR_DEFAULT;
    }
  }, node => node.id());
  const getNodeShape = _.memoize(node => {
    const regFunction = node.data('regulatoryFunction');
    switch (regFunction) {
      case 'regulator': return 'hexagon';
      default:          return 'ellipse';
    }
  }, node => node.id());
  const getEdgeColor = _.memoize(edge => {
    const cluster = edge.data('clusterNumber');
    const colorNumber = cluster % CLUSTER_COLORS.length;
    const color = chroma(CLUSTER_COLORS[colorNumber]);
    return color.hex();
  }, edge => edge.id());

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
          'border-width': 12,
          'border-opacity': 0,
          'width':  40,
          'height': 40,
          'font-size': '8px',
          'text-valign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': 80,
          'text-outline-width': 2,
          'text-outline-opacity': TEXT_OPACITY,
          'color': '#fff',
          'background-color':   getNodeColor,
          'text-outline-color': getNodeColor,
          'shape': getNodeShape,
          'z-index': 1,
          'label': nodeLabel,
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
          'border-width': 8,
          'border-color': SELECTED_BORDER_COLOR,
          'border-opacity': 1.0,
          'text-outline-color': SELECTED_BORDER_COLOR,
          'z-index': 99999999,
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#333333',
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
};

export default createNetworkStyle;