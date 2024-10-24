import Express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import Datastore from '../../datastore.js';


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

/**
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
 * Returns a network given its ID.
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
 * Update the data given its ID--right now, this only supports updating the 'name'.
 */
http.put('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updated = await Datastore.updateState(id, { name });
    console.log("updated", updated);
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


http.get('/:id/positions', async function(req, res, next) {
  try {
    const { id } = req.params;

    const positions = await Datastore.getPositions(id);
    if(!positions) {
      res.sendStatus(404);
    } else {
      res.send(JSON.stringify(positions));
    }

    res.sendStatus(404);
    
  } catch (err) {
    next(err);
  }
});

http.post('/:id/positions', async function(req, res, next) {
  try {
    const { id } = req.params;
    const { positions } = req.body;

    if(!Array.isArray(positions)) {
      res.sendStatus(404);
      return;
    }

    await Datastore.setPositions(id, positions);

    res.send('OK');
  } catch (err) {
    next(err);
  }
});

http.delete('/:id/positions', async function(req, res, next) {
  try {
    const { id } = req.params;
    await Datastore.deletePositions(id);
    res.send('OK');
  } catch (err) {
    next(err);
  }
});


export async function writeCursorToResult(cursor, res) {
  res.write('[');
  if(await cursor.hasNext()) {
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