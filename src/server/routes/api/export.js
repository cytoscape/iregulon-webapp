import Express from 'express';
import Datastore from '../../datastore.js';

const http = Express.Router();


http.get('/results/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const results = await Datastore.getResultsForExport(id, { type: 'text' });

    res.write(results.text);
    res.write('\n');
    res.end();

  } catch(err) {
    next(err);
  }
});

http.get('/params/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const results = await Datastore.getResultsForExport(id, { type: 'params' });

    Object.entries(results.params).forEach(([key, value]) => {
      res.write(`${key}\t${value}\n`);
    });
    res.write('\n');
    res.end();

  } catch(err) {
    next(err);
  }
});

http.get('/irf/:id', async function(req, res, next) {
  try {
    const { id } = req.params;

    const results = await Datastore.getResultsForExport(id, { type: 'results' });

    const xml = createXMLBuilder(res);
    createIrfXml(xml, results);
    xml.end();

  } catch(err) {
    next(err);
  }
});


function createXMLBuilder(res) {
  // stream the response to the client
  const xml = { indent: 0, res };
  const inc = () => xml.indent++;
  const dec = () => xml.indent--;
  const wht = () => '  '.repeat(xml.indent);

  // Creates a text element on one line
  xml.text = (name, text) => {
    if(text) {
      res.write(`${wht()}<${name}>${text}</${name}>\n`);
    } else {
      res.write(`${wht()}<${name}/>\n`);
    }
  };

  xml.num = (name, num) => {
    if(num === null || num === undefined || num === '') {
      num = 'NaN';
    }
    res.write(`${wht()}<${name}>${num}</${name}>\n`);
  };

  // Creates an element with child elements
  xml.eleBody = (name, body) => {
    res.write(`${wht()}<${name}>\n`);
    inc();
    body();
    dec();
    res.write(`${wht()}</${name}>\n`);
  };

  // Creates an element with attributes and child elements
  xml.eleAttrBody = (name, attributes, body) => {
    const atts = Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ');
    res.write(`${wht()}<${name} ${atts}>\n`);
    inc();
    body();
    dec();
    res.write(`${wht()}</${name}>\n`);
  };

  // Loops over the array and creates an element for each item  
  xml.forEach = (name, arr, body) => {
    xml.forEachFilter(name, arr, () => true, body);
  };

  // Loops over the array and creates an element for each item, with a filter
  xml.forEachFilter = (name, arr, filter, body) => {
    if(arr.length === 0)
      return;
    for(const obj of arr) {
      if(filter(obj)) {
        xml.eleBody(name, () => body(obj));
      }
    }
  };

  xml.end = () => {
    res.write('\n');
    res.end();
  };

  return xml;
}


function geneIDtoXML(xml, gene) {
  xml.eleBody('geneID', () => {
    xml.text('geneName', gene.name);
    xml.eleBody('speciesNomenclature', () => {
      xml.text('code', gene.speciesNomenclature?.nomenclatureCode || 1);
    });
  });
}


function motifOrTrackToXML(xml, result) {
  xml.text('trackType', result.type);
  xml.text('name', result.name);
  xml.text('clusterCode', result.clusterCode);
  xml.text('clusterNumber', result.clusterNumber);
  xml.text('rank', result.rank);
  xml.text('description', result.description);
  xml.text('featureID', result.featureID);
  xml.text('neScore', result.nes);
  xml.text('aucValue', result.auc);

  xml.eleBody('candidateTargetGenes', () =>
    xml.forEach('candidateTargetGene', result.candidateTargetGenes, gene => {
      xml.text('rank', gene.rank);
      geneIDtoXML(xml, gene.geneID);
    })
  );

  xml.eleBody('transcriptionFactors', () =>
    xml.forEach('transcriptionFactor', result.transcriptionFactors, tf => {
      geneIDtoXML(xml, tf.geneID);
      xml.num('minOrthologousIdentity', tf.minOrthologousIdentity);
      xml.num('maxMotifSimilarityFDR', tf.maxMotifSimilarityFDR);
      xml.text('similarMotifName', tf.similarMotifName);
      xml.text('similarMotifDescription', tf.similarMotifDescription);
    })
  );
}


function createIrfXml(xml, results) {
  // begin serialization
  xml.eleBody('domainmodel.Results', () => {  // root

    xml.eleBody('motifs', () => {
      xml.forEachFilter('motif', results.results, 
        result => result.type === 'MOTIF', 
        result => motifOrTrackToXML(xml, result)
      );
    });

    xml.eleBody('tracks', () => {
      xml.forEachFilter('track', results.results, 
        result => result.type === 'TRACK', 
        result => motifOrTrackToXML(xml, result)
      );
    });

    xml.eleBody('predictRegulatorsParameters', () => {
      xml.eleAttrBody('genes', { 'class':'list' }, () => {
        xml.forEach('geneIdentifier', results.genes, gene => {
          xml.text('geneName', gene.name);
          xml.eleBody('speciesNomenclature', () => {
            xml.num('code', 1);
          });
        });
      });

      xml.num('eScore', 3.0);
      xml.num('thresholdForVisualisation', 5000);
      xml.num('rocThresholdAUC', 0.03);
      xml.eleBody('speciesNomenclature', () => {
        xml.num('code', 1);
      });
      xml.text('iRegulonType', 'PREDICTED_REGULATORS');
      xml.text('name', 'hypoxia_geneset.txt');
      xml.text('motifCollection', '10K (9713 PWMs)');
      xml.text('trackCollection', '1120 ChIP-seq tracks (ENCODE raw signals)');
      xml.num('minOrthologous', 0.0);
      xml.num('maxMotifSimilarityFDR', 0.001);
      xml.text('isRegionBased', 'false');
      xml.eleBody('motifRankingsDatabase', () => {
        xml.text('code', 'hg19_tss_centered_10kb_7sp_mc_v6');
        xml.text('name', '20kb centered around TSS (7 species)');
        xml.eleBody('delineationDefault', () => {
          xml.text('code');
          xml.text('name');
        });
        xml.num('NESvalue', 3.0);
        xml.num('AUCvalue', 0.03);
        xml.num('visualisationValue', 5000);
      });
      xml.eleBody('trackRankingsDatabase', () => {
        xml.text('code', 'hg19_tss_centered_10kb_chip_v1');
        xml.text('name', '20kb centered around TSS (ChIP-seq-derived)');
        xml.eleBody('delineationDefault', () => {
          xml.text('code');
          xml.text('name');
        });
        xml.num('NESvalue', 3.0);
        xml.num('AUCvalue', 0.03);
        xml.num('visualisationValue', 5000);
      });
      xml.num('overlap', -1.0);
      xml.text('delineation');
      xml.num('upstream', -1);
      xml.num('downstream', -1);
      xml.text('attributeName', 'name');
    });
  });
}


export default http;