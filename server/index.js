// server/index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const generateRandomString = (length) => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const scope = 'user-read-private user-read-email playlist-read-private';

app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const authQueryParameters = querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: scope,
    redirect_uri: REDIRECT_URI,
    state: state,
  });

  res.redirect(
    `https://accounts.spotify.com/authorize?${authQueryParameters}`
  );
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (state === null) {
    return res.redirect(
      '/#' + querystring.stringify({ error: 'state_mismatch' })
    );
  }

  const authOptions = {
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
    },
  };

  try {
    const response = await axios(authOptions);
    const access_token = response.data.access_token;
    const refresh_token = response.data.refresh_token;

    res.redirect(
      `http://localhost:3000/#${querystring.stringify({
        access_token: access_token,
        refresh_token: refresh_token,
      })}`
    );
  } catch (error) {
    console.error(error);
    res.redirect(
      '/#' + querystring.stringify({ error: 'invalid_token' })
    );
  }
});

app.get('/refresh_token', async (req, res) => {
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
    },
  };

  try {
    const response = await axios(authOptions);
    res.send({
      access_token: response.data.access_token,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
