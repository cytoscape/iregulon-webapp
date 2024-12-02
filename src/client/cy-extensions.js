import Cytoscape from 'cytoscape';
import cise from 'cytoscape-cise';
import cola from 'cytoscape-cola';
import euler from 'cytoscape-euler';
import fcose from 'cytoscape-fcose';
import Layers from 'cytoscape-layers';
import automove from 'cytoscape-automove';
import Pdf from 'cytoscape-pdf-export';


export const registerCytoscapeExtensions = () => {
  // Layout extensions
  Cytoscape.use(cise);
  Cytoscape.use(cola);
  Cytoscape.use(euler);
  Cytoscape.use(fcose);
  Cytoscape.use(Layers);
  Cytoscape.use(automove);

  // Collection extensions
  Cytoscape.use(isDemo);

  // Core extensions
  Cytoscape.use(Pdf);
};


function isDemo(cytoscape) {
  const isDemoImpl = function() {
    const cy = this;
    return Boolean(cy.data('demo'));
  };
  cytoscape('core', 'isDemo', isDemoImpl);
}