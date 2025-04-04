import Express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import Datastore from '../../datastore.js';
import { NCBI_API_KEY } from '../../env.js';


const __dirname = dirname(fileURLToPath(import.meta.url));
const http = Express.Router();


/*
 * This is just for pinging the server.
 */
http.get('/', async function(req, res) {
  res.send("OK");
});

/*
 * This is for simulating a server error, useful for debugging.
 */
http.get('/iamerror', async function(req, res) {
  res.sendStatus(500);
});

/*
 * Get file names of sample input data.
 */
http.get('/sample-data', async function(req, res, next) {
  try {
    const files = await fs.promises.readdir(path.join(__dirname, '../../../../', 'public/sample-data'));

    const sanitizedFiles = files
      .filter(f => !f.startsWith('.'))
      .sort();

    res.send(sanitizedFiles);
  } catch (err) {
    next(err);
  }
});


/* 
 * Returns the results given its ID.
 */
http.get('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const results = await Datastore.getMotifsAndTracks(id);
    
    if (!results) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(results));
    }
  } catch (err) {
    next(err);
  }
});


/* 
 * Update the network data given its ID--right now, this only supports updating the 'networkName'.
 */
http.put('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updated = await Datastore.updateState(id, { name });
    
    res.sendStatus(updated ? 204 : 409);
  } catch (err) {
    next(err);
  }
});


/*
 * Returns the all the genes and ranks in the given network.
 */
http.get('/:id/genesforsearch', async function(req, res, next) {
  try {
    const { id } = req.params;
    const genes = await Datastore.getGenesForSearch(id);
    res.write(JSON.stringify(genes));
  } catch (err) {
    next(err);
  } finally {
    res.end();
  }
});


/*
 * Returns the iRegulon results associated with a network.
 */
http.get('/:id/results', async function(req, res, next) {
  try {
    const { id } = req.params;
    const results = await Datastore.getResultsForSearch(id);
    res.write(JSON.stringify(results));
  } catch (err) {
    next(err);
  } finally {
    res.end();
  }
});


http.get('/:id/uistate', async function(req, res, next) {
  try {
    const { id } = req.params;

    const state = await Datastore.getUIState(id);
    if (!state) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(state));
    }
  } catch (err) {
    next(err);
  }
});

http.post('/:id/uistate', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { positions, state } = req.body;

    if(!Array.isArray(positions)) {
      res.sendStatus(404);
      return;
    }

    await Datastore.setUIState(id, positions, state);

    res.send('OK');
  } catch (err) {
    next(err);
  }
});


/* 
 * Endpoint to save a new network snapshot to the database.
 * The `id` parameter is the ID of the results the network was created from.
 * The request body must contain the `network` parameter (CX2 format).
 * It returns the ID of the network snapshot.
 */
http.post('/:id/cx2', async function(req, res, next) {
  try {
    const { id: resultsID } = req.params;
    const { network } = req.body;

    const networkID = await Datastore.saveExportedNetwork({ resultsID, network });

    res.json({ networkID });
  } catch (err) {
    next(err);
  }
});


/* 
 * Endpoint that returns a network in CX2 format given the network ID.
 */
http.get('/:netId/cx2', async function(req, res, next) {
  try {
    const { netId } = req.params;
    const doc = await Datastore.getExportedNetwork(netId);

    if (!doc || !doc.cx2) {
      res.sendStatus(404);
    } else {
      res.set('Access-Control-Allow-Origin', '*'); // To prevent CORS policy errors
      res.send(JSON.stringify(doc.cx2));
    }
  } catch (err) {
    next(err);
  }
});

/**
 * Proxy request for querying gene metadata from NCBI API.
 */
http.get('/gene/:symbol/taxon/:taxon', async function(req, res, next) {
  try {
    console.log('NCBI_API_KEY:', NCBI_API_KEY?.slice(0, 4) + '...'); // TODO: remove this line in production

    const { symbol, taxon } = req.params;
    const response = await fetch(`https://api.ncbi.nlm.nih.gov/datasets/v2/gene/symbol/${symbol}/taxon/${taxon}/dataset_report`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(NCBI_API_KEY && { 'api-key': NCBI_API_KEY }),
      },
    });

    if (!response.ok) {
      res.sendStatus(response.status);
      return;
    }

    const geneData = await response.json();
    res.send(geneData);
  } catch (err) {
    next(err);
  }
});


export async function writeCursorToResult(cursor, res) {
  res.write('[');
  if (await cursor.hasNext()) {
    const obj = await cursor.next();
    res.write(JSON.stringify(obj));
  }
  while(await cursor.hasNext()) {
    res.write(',');
    const obj = await cursor.next();
    res.write(JSON.stringify(obj));
  }
  res.write(']');
}

export default http;