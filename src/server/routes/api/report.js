import Express from 'express';
import Datastore from '../../datastore.js';
import { writeCursorToResult } from './index.js';
import { REPORT_SECRET } from '../../env.js';

const http = Express.Router();

http.get(`/count/:secret`, async function(req, res, next) {
  
  try {
    const { secret } = req.params;
    if(secret !== REPORT_SECRET) {
      res.sendStatus(404);
      return;
    }

    const counts = await Datastore.getResultCounts();
    res.send(JSON.stringify(counts));

  } catch(err) {
    next(err);
  }
});

http.get(`/results/:secret`, async function(req, res, next) {
  try {
    const { secret } = req.params;
    if(secret !== REPORT_SECRET) {
      res.sendStatus(404);
      return;
    }

    const cursor = await Datastore.getResultStatsCursor();
    await writeCursorToResult(cursor, res);
    cursor.close();

  } catch(err) {
    next(err);
  } finally {
    res.end();
  }
});

export default http;