import * as bodyParser from 'body-parser';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import jwt = require('jsonwebtoken');
import * as path from 'path';
import { sendMail } from './Nodemailer';

// json-server
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('./db.json');
const userdb = JSON.parse(fs.readFileSync('./users.json', 'UTF-8'));
const SECRET_KEY = 'verySecretJwtPW';
const expiresIn = '1h';
const importFresh = require('import-fresh');

export interface User {
  eMail: string;
  password: string;
}

server.use(jsonServer.defaults());
server.use(bodyParser.urlencoded({ extended: true }));
// server.use(bodyParser.json());
server.use(bodyParser.json({ limit: '50mb' }));
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

export const createUser = ({ eMail, password }: { eMail: string; password: string }) => {
  userdb.users.push({
    eMail,
    password
  });

  const data = JSON.stringify(userdb, null, 2);
  fs.writeFileSync('users.json', data);
  return data;
};

export const resync = () => {
  //return router.db.assign(require('import-fresh')(path.join(__dirname, './db.json'))).write();
  //const importedDB = importFresh(path.join(__dirname, './db.json'))();
  
  console.log('resync function')
  let importedDB = importFresh('/home/Server/dist/db.json');
  console.log(importedDB)
  return router.db.assign(importFresh('/home/Server/dist/db.json')).write();
};

// Create a token from a payload
export const createToken = (payload: User) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
};

// Verify the token
export const verifyToken = (token: string): any => {
  return jwt.verify(token, SECRET_KEY, (err, decode) => {
    if (err) {
      const status = 403;
      const message = err;
      const VError = [status, message];
      return VError;
    } else {
      return decode;
    }
  });
};

// Check if the user exists in database
export const isLoginCorrect = ({ eMail, password }: { eMail: string; password: string }) => {
  return userdb.users.findIndex((user: User) => user.eMail === eMail && user.password === password) !== -1;
};

// Check if the eMail exists
export const isUserAvailable = ({ eMail }: { eMail: string }) => {
  return userdb.users.findIndex((user: User) => user.eMail === eMail) !== -1;
};

server.post('/sendmail', (req: Request, res: Response) => {
  const user = {
    eMail: req.body.eMail,
    password: req.body.password
  };
  console.log(req.body.eMail);
  console.log(req.body.password);
  const key = createToken(user);
  const link = `http://couponing24.ddns.net:3030/auth/createlogin/${key}`;

  const eMailtext: string =
    'Hello,' +
    `\n` +
    'Please click on the link to verify your eMail:' +
    `\n` +
    `\n` +
    link +
    `\n` +
    `\n` +
    'best regards' +
    `\n` +
    `\n` +
    'your team xyz';

  const status = 200;
  const message = sendMail('gmail', 'XXXX', 'XXXX', req.body.eMail, 'Nodemail', eMailtext);
  return res.status(status).json({ status, message, user });
});

server.get('/auth/createlogin/:key', (req: Request, res: Response) => {
  console.log('one')
  const userSTRING = JSON.stringify(verifyToken(req.params.key));
  const userJSON = JSON.parse(userSTRING);
  const { eMail, password } = userJSON;
  console.log('two')
  res.status(200).redirect('http://couponing24.ddns.net:5000/#/LoginPage')
  if (isUserAvailable({ eMail })) {
    const status = 401;
    const message = 'eMail already exists';
    return res.status(status).json({ status, message });
  }
  console.log('three')
  if (!password) {
    const status = 401;
    const message = 'Password is not defined';
    return res.status(status).json({ status, message });
  }
  console.log('four')
  if (!eMail) {
    const status = 401;
    const message = 'eMail is not defined';
    return res.status(status).json({ status, message });
  }
  console.log('five')
  const obj: any = {};
  obj[eMail] = [];
  console.log(obj)
  router.db.defaults(obj).write()

//resync()
const importedDB = importFresh('/home/Server/dist/db.json')
router.db.assign(importedDB).write();

  createUser({ eMail, password });
  console.log('seven')

  console.log('eight')
  return 0;
});

server.post('/auth/login', (req: Request, res: Response) => {
  const { eMail, password } = req.body;
  console.log(eMail);
  console.log(password);
  if (!isLoginCorrect({ eMail, password })) {
    const status = 401;
    const message = 'Incorrect eMail or password';
    return res.status(status).json({ status, message });
  }

  const access_token = createToken({ eMail, password });
  console.log(access_token);
  return res.status(200).json({ access_token });
});

server.post('/auth/verify', (req: Request, res: Response) => {
  if (!req.headers.authorization) {
    const status = 401;
    const message = 'Bad authorization header';
    return res.status(status).json({ status, message });
  }
  try {
    const user = verifyToken(req.headers.authorization);
    return res.status(200).json(user); // userContext
  } catch (err) {
    const status = 401;
    const message = 'Error: access_token is not valid';
    return res.status(status).json({ status, message });
  }
});

server.use('/:link', (req: Request, res: Response, next: NextFunction) => {
  const link = req.params.link;
  const method = req.method;
  console.log("link:" + link)
  if (link === 'public' && method === 'GET') {
    console.log("GET TO PUBLIC-TABLE!")
    return next();
  }

  if (!req.headers.authorization) {
    const status = 401;
    const message = 'Bad authorization header';
    return res.status(status).json({ status, message });
  }
  if (verifyToken(req.headers.authorization)[0] === 403) {
    const status = verifyToken(req.headers.authorization)[0];
    const message = verifyToken(req.headers.authorization)[1];
    return res.status(status).json({ status, message });
  }
  console.log("TOKEN CORRECT!")
  const userSTRING = JSON.stringify(verifyToken(req.headers.authorization));
  const userJSON = JSON.parse(userSTRING);
  const id: number = Number(req.body.publicid);
  const post = router.db
    .get('public')
    .find({ id })
    .value();
  console.log(post);
  console.log("link:" + link + "///user:" + userJSON.eMail)


  if (userJSON.eMail === 'admin') {
    return next();
  }
  if (link === userJSON.eMail) {
    return next();
  }
  if (link === 'public' && method === 'POST') {
    return next();
  }
  if (link === 'public' && (method === 'PATCH' || 'DELETE') && post.eMail === userJSON.eMail) {
    return next();
  }

  const status = 401;
  const message = 'User-specific-Error';
  return res.status(status).json({ status, message });
});

server.use(router);

server.listen(3030, () => {
  console.log('Run JSON-Server with Auth API Server');
});
