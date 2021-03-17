const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('./jwt');
const client = require('../client');
const ensureAuth = require('./ensure-auth');

function getProfileWithToken(user) {
  // eslint-disable-next-line no-unused-vars
  const { hash, ...rest } = user;
  return {
    ...rest,
    token: jwt.sign({ id: user.id })
  };
}

const defaultQueries = {
  selectUser(username) {
    return client.query(`
      SELECT id, username, hash
      FROM users
      WHERE username = $1;
  `,
    [username]
    ).then(result => result.rows[0]);
  },
  insertUser(user, hash) {
    return client.query(`
      INSERT into users (username, hash)
      VALUES ($1, $2)
      RETURNING id, username;
  `,
    [user.username, hash]
    ).then(result => result.rows[0]);
  }
};

module.exports = function createAuthRoutes(queries = defaultQueries) {
  // eslint-disable-next-line new-cap
  const router = express.Router();

  router.get('/verify', ensureAuth, (req, res) => {
    res.json({ verified: true });
  });

  router.post('/signup', (req, res) => {
    const { password, ...user } = req.body;
    const username = user.username;

    // username and password needs to exist
    if(!username || !password) {
      res.status(400).json({ error: 'username and password required' });
      return;
    }

    // username needs to not exist already
    queries.selectUser(username)
      .then(foundUser => {
        if(foundUser) {
          res.status(400).json({ error: 'username already exists' });
          return;
        }

        // insert into profile the new user
        queries.insertUser(user, bcrypt.hashSync(password, 8))
          .then(user => {
            res.json(getProfileWithToken(user));
          });
      });
  });

  router.post('/signin', (req, res) => {
    const body = req.body;
    const username = body.username;
    const password = body.password;

    // username and password needs to exist
    if(!username || !password) {
      res.status(400).json({ error: 'username and password required' });
      return;
    }

    queries.selectUser(username)
      .then(user => {
        // does username match one in db?
        // #1 !user - if no user, then no match on a row for username
        // #2 !compareSync - provided password did not match hash from db
        if(!user || !bcrypt.compareSync(password, user.hash)) {
          res.status(400).json({ error: 'username or password incorrect' });
          return;
        }

        res.json(getProfileWithToken(user));
      });
  });

  return router;
};
