import Express from 'express';
import Datastore from '../../datastore.js';

const http = Express.Router();


// TODO


async function sendDataLines(cursor, res, { type='tsv', header, objToStr } ) {
  try {
    if(!(await cursor.hasNext())) {
      res.sendStatus(404);
      return;
    }

    res.type(type);
    if(header) {
      res.write(header);
      res.write('\n');
    }

    while(await cursor.hasNext()) {
      const obj = await cursor.next();
      const str = objToStr(obj);
      res.write(str);
      res.write('\n');
    }
    // DO NOT add a newline at the end of the file, it will break EM-desktop
    
  } finally {
    cursor.close();
    res.end();
  }
}


export default http;