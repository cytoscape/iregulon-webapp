import Cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import Layers from 'cytoscape-layers';
import automove from 'cytoscape-automove';
import Pdf from 'cytoscape-pdf-export';

export const registerCytoscapeExtensions = () => {
  // Layout extensions
  Cytoscape.use(fcose);
  Cytoscape.use(Layers);
  Cytoscape.use(automove);

  // Collection extensions
  Cytoscape.use(internalEdges);
  Cytoscape.use(shuffle);

  // Core extensions
  Cytoscape.use(Pdf);
};


function internalEdges(cy) {
  const internalEdgesImpl = function(node) {
    const eles = this;
    const cluster = eles.nodes();
    const nodes = node ? node : cluster;
    return nodes.connectedEdges().filter(e => cluster.contains(e.source()) && cluster.contains(e.target()));
  };
  cy('collection', 'internalEdges', internalEdgesImpl);
}


function shuffle(cy) {
  const shuffleArray = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  };
  const shuffleImpl = function() {
    const eles = this;
    const arr = eles.toArray();
    shuffleArray(arr);
    return eles.cy().collection(arr);
  };
  cy('collection', 'shuffle', shuffleImpl);
}
