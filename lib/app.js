const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const morgan = require('morgan');
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev')); // http logging

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .username and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

app.get('/responses', async(req, res) => {
  try {
    const data = await client.query('SELECT * from responses');
    
    res.json(data.rows);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.get('/responses/:id', async(req, res) => {
  try {
    const data = await client.query('SELECT * from responses where id=$1', [req.params.id]);
    
    res.json(data.rows[0]);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/responses', async(req, res) => {
  try {
    const { regex, images } = req.body;
    const data = await client.query(`
    INSERT into responses (regex, images, owner_id)
    values ($1, $2, $3)
    returning *`,
    [
      regex,
      images,
      req.userId
    ]);
    
    res.json(data.rows[0]);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/responses/:id', async(req, res) => {
  try {
    const { regex, images } = req.body;
    const data = await client.query(`
    UPDATE responses
    SET regex = $1, images = $2
    where id=$3
    returning *`,
    [
      regex,
      images,
      req.params.id
    ]);
    
    res.json(data.rows[0]);
  } catch(e) {
    
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/responses/:id', async(req, res) => {
  const data = await client.query('DELETE from responses where id=$1 returning *', [req.params.id]);

  res.json(data.rows[0]);
});

app.use(require('./middleware/error'));

module.exports = app;
