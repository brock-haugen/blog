---
title: OAuth in Node.js
date: 2021-05-21
---

So apparently there's no simple, straightforward way to implement OAuth in Node.js. There are some libraries that do a lot of the work, but many implementations rely on a 3rd party server actually generating the tokens (e.g. [Okta](https://developer.okta.com/docs/concepts/oauth-openid/)). This is a quick guide on my implementation of a self-service solution for generating and authenticating OAuth tokens. Specifically, this will be using Node.js, Express.js, and the `client_credentials` grant type.

If you need a primer on what OAuth is and why/when you should use it, head over to [https://oauth.net/2/](https://oauth.net/2/). For another perspective, check out [this guide from LogRocket](https://blog.logrocket.com/implementing-oauth-2-0-in-node-js/).

Before we start, a disclaimer: **DO NOT COPY PASTE THIS FOR PRODUCTION USE**. This is only meant for illustrative purposes and should be augmented for any "real" uses to include a database, environment variables, logging, etc, etc.

## Setup

As mentioned before, this is a guide for [Node.js](https://nodejs.org/). We'll start by ensuring [`express`](https://expressjs.com/) is installed:

```shell
$ npm install express
```

Now setup our server:

```js
// server.js

// import our dependencies
const express = require("express");

// initiate the router
const app = express();

// ensure we can accept JSON
app.use(express.json());

// setup a simple ping route to ensure things are working
app.get("/ping", (req, res) => {
  res.status(200).send({ message: "pong" });
});

// start the app
const PORT = 3000;
console.log(`App running on port ${PORT}`);
app.listen(PORT);
```

Start the server with `node server.js` and try calling our `GET /ping` route as a sanity check that things are working:

```shell
$ curl http://localhost:3000/ping
```

You should expect to see a response like this in your terminal:

```shell
{"message":"pong"}
```

## Adding OAuth

Now that we have a working server, the fun can begin.

### Setup the library

We're going to leverage the [`oauth2-server` npm package](https://www.npmjs.com/package/oauth2-server). Theoretically this would work out of the box, but there are a few reasons why I wouldn't:

1. It only speaks in `x-www-form-urlencoded` format - if you're building anything modern, your server is likely conversing in JSON
2. No control of error handling

NOTE: there are also libraries such as `express-oauth2-server`. I personally found these to be even more combursome to use, but your mileage may vary.

So without further ado, install `oauth2-server` and include it in your server:

```shell
$ npm install oauth2-server
```

```js
// server.js

// import our dependencies
const express = require("express");
const OAuth2Server = require("oauth2-server");

...
```

There's a couple concepts to quickly understand now: OAuth broadly works by verifying that a client is who they say they are, and then generating a temporary token for that client to use. With that in mind, we'll want to add a way to "store" `clients` and `tokens` in our server. Again, since this is just for illustration we're going to use in memory arrays, but in production please use a database.

```js
...

// ensure we can accept JSON
app.use(express.json());

// define our stores of clients and tokens
// NOTE: don't do this in production, use a database
const clients = [
  {
    _id: "some-id",
    grants: ["client_credentials"],
    name: "some client",
    secret: "some-secret",
  },
];
const tokens = [];

...
```

Secondly, we need what `OAuth2Server` calls a "model" for getting clients/users/tokens and storing tokens. Below is a quick and dirty implementation of this model with inline comments.

NOTE: other methods may be required for different grant types.

```js
// server.js

...

// ensure we can accept JSON
app.use(express.json());

// define our stores of clients and tokens
// NOTE: don't do this in production, use a database
const clients = [
  {
    _id: "some-id",
    grants: ["client_credentials"],
    name: "some client",
    secret: "some-secret",
  },
];
const tokens = [];

// define our oauthModel
// https://oauth2-server.readthedocs.io/en/latest/model/spec.html
const oauthModel = {
  // getAccessToken looks up a token by a given accessToken
  getAccessToken(accessToken) {
    // try finding the token
    return tokens.find(t => t.accessToken === accessToken);
  },

  // getClient looks up a client by a given ID + Secret
  getClient(clientId, clientSecret) {
    const client = clients.find(
      c => c._id === clientId && c.secret === clientSecret,
    );

    // if we've found a client
    if (client) {
      // then return the necessary fields - don't return the secret
      return {
        _id: client._id,
        grants: client.grants,
        name: client.name,
      };
    }

    // otherwise return null
    return null;
  },

  // getUserFromClient returns a user for the given client
  getUserFromClient(client) {
    // since our client is the user ("client_credentials"), just return that
    return client ? { name: client.name } : null;
  },

  // saveToken stores the generated token for later use
  saveToken(tokenParams, client, user) {
    // construct a full token object
    const token = {
      ...tokenParams,
      client,
      user: {
        name: user.name,
      },
    };

    // "save" our token
    tokens.push(token);

    // return the token for OAuth2Server to consume
    return token;
  },
};

...
```

Finally, we're ready to actually instantiate `OAuth2Server`. Add this code below the model definition in your server:

```js
...

// instantiate a new OAuth 2.0 server
const oauth = new OAuth2Server({
  accessTokenLifetime: 15 * 60, // 15 minutes
  grants: ["client_credentials"], // define what type of grants we'll allow
  model: oauthModel, // pass in our model
});

...
```

### Create useful middleware

Now that we have an OAuth implementation ready to go, let's make it useful in the context of Express.js. To do that, we're going to implement two middleware handlers: `authenticate` and `generate`. The latter will accept a valid token and check it against our "stored" list of tokens. The former will converting a JSON request including `client_id` and `client_secret` parameters and passing it off to our OAuth instance to generate and "store" a token. Here's the implementation:

```js
...

// instantiate a new OAuth 2.0 server
const oauth = new OAuth2Server({
  accessTokenLifetime: 15 * 60, // 15 minutes
  grants: ["client_credentials"], // define what type of grants we'll allow
  model: oauthModel, // pass in our model
});

const oauthMiddleware = {
  // define a handler for authenticating our OAuth 2.0 flow
  async authenticate(req, res, next) {
    // wrap this in a try/catch block to more appropriately capture the error cases
    try {
      // try authenticating the request
      // NOTE: expecting a `Authorization: Bearer <token>` type header
      await oauth.authenticate(
        new OAuth2Server.Request(req),
        new OAuth2Server.Response(),
      );
    } catch (e) {
      // if an error was thrown, then send it along
      res
        .status(e.statusCode)
        .send({ error: e.name, error_message: e.message });
      return;
    }

    // otherwise assume everything is a-okay
    next();
  },

  // define a handler for creating a token given a client_id, client_secret, and grant_type
  async generate(req, res) {
    let token = null;

    // wrap this in a try/catch block to better handle the errors
    try {
      // map the request to a standard OAuth2Server request body
      const oauthBody = {
        client_id: req.body.client_id,
        client_secret: req.body.client_secret,
        grant_type: req.body.grant_type,
      };

      // figure out the content length to ensure content-type checks pass
      const formBodyLength = Object.entries(oauthBody)
        .map(([a, b]) => `${a}=${b}`)
        .join("&").length;

      // try generating a token
      token = await oauth.token(
        new OAuth2Server.Request({
          body: oauthBody,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": formBodyLength,
          },
          method: "POST",
          query: {},
        }),
        new OAuth2Server.Response(),
      );
    } catch (e) {
      // if we failed, then surface that error in a structured way
      res
        .status(e.statusCode)
        .send({ error: e.name, error_message: e.message });
      return;
    }

    // we should never get here without already returning an error or generating a token
    if (!token) {
      // but if we do, send back a 400
      res.status(400).send({
        error: "invalid_credentials",
        error_message: "Unable to grant token",
      });
      return;
    }

    // if we've come this far then send along the token values
    res.status(200).send({
      access_token: token.accessToken,
      expires_at: token.accessTokenExpiresAt,
      token_type: "Bearer",
    });
  },
};

...
```

### Adding the routes

Lastly, stand up some quick routes for creating and checking tokens using our new `oauthMiddleware`:

```js
...

// setup a route to generate OAuth tokens
app.post("/oauth/token", oauthMiddleware.generate);

// setup a route to check these tokens
app.get("/oauth/check", oauthMiddleware.authenticate, (req, res) => {
  res.status(200).send({ message: "ok" });
});

// setup a simple ping route to ensure things are working
app.get("/ping", (req, res) => {
  res.status(200).send({ message: "pong" });
});

// start the app
const PORT = 3000;
console.log(`App running on port ${PORT}`);
app.listen(PORT);
```

## Test it out!

Restart the server if you haven't already

```shell
$ node server.js
```

Run our same `GET /ping` sanity check:

```shell
$ curl http://localhost:3000/ping
{"message":"pong"}
```

Now try checking an invalid token:

```shell
$ curl --request GET \
  --url http://localhost:3000/oauth/check \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer invalid-token'
{"error":"invalid_token","error_message":"Invalid token: access token is invalid"}
```

Try creating a new token (we're using the hard-coded credentials defined in our "store"):

```shell
$ curl --request POST \
  --url http://localhost:3000/oauth/token \
  --header 'Content-Type: application/json' \
  --data '{
	"client_id": "some-id",
	"client_secret": "some-secret",
	"grant_type": "client_credentials"
}'
{"access_token":"9013d761e7fb656b1251a06c1bf62fe1b55a0935","expires_at":"2021-05-22T20:29:13.885Z","token_type":"Bearer"}
```

Now try checking the valid token (the `access_token` above - NOTE: yours will be different):

```shell
$ curl --request GET \
  --url http://localhost:3000/oauth/check \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer 9013d761e7fb656b1251a06c1bf62fe1b55a0935'
{"message":"ok"}
```

That's it! Still not simple... but we now have a full-fledged OAuth 2.0 implementation within Node.js + Express.js. If you want to perform different grant type flows (or just want to learn more) head over to the [oauth2-server docs](https://oauth2-server.readthedocs.io/en/latest/).

## The final, full implementation

```js
// server.js

// import our dependencies
const express = require("express");
const OAuth2Server = require("oauth2-server");

// initiate the router
const app = express();

// ensure we can accept JSON
app.use(express.json());

// define our stores of clients and tokens
// NOTE: don't do this in production, use a database
const clients = [
  {
    _id: "some-id",
    grants: ["client_credentials"],
    name: "some client",
    secret: "some-secret",
  },
];
const tokens = [];

// define our oauthModel
// https://oauth2-server.readthedocs.io/en/latest/model/spec.html
const oauthModel = {
  // getAccessToken looks up a token by a given accessToken
  getAccessToken(accessToken) {
    // try finding the token
    return tokens.find((t) => t.accessToken === accessToken);
  },

  // getClient looks up a client by a given ID + Secret
  getClient(clientId, clientSecret) {
    const client = clients.find(
      (c) => c._id === clientId && c.secret === clientSecret,
    );

    // if we've found a client
    if (client) {
      // then return the necessary fields - don't return the secret
      return {
        _id: client._id,
        grants: client.grants,
        name: client.name,
      };
    }

    // otherwise return null
    return null;
  },

  // getUserFromClient returns a user for the given client
  getUserFromClient(client) {
    // since our client is the user ("client_credentials"), just return that
    return client ? { name: client.name } : null;
  },

  // saveToken stores the generated token for later use
  saveToken(tokenParams, client, user) {
    // construct a full token object
    const token = {
      ...tokenParams,
      client,
      user: {
        name: user.name,
      },
    };

    // "save" our token
    tokens.push(token);

    // return the token for OAuth2Server to consume
    return token;
  },
};

// instantiate a new OAuth 2.0 server
const oauth = new OAuth2Server({
  accessTokenLifetime: 15 * 60, // 15 minutes
  grants: ["client_credentials"], // define what type of grants we'll allow
  model: oauthModel, // pass in our model
});

const oauthMiddleware = {
  // define a handler for authenticating our OAuth 2.0 flow
  async authenticate(req, res, next) {
    // wrap this in a try/catch block to more appropriately capture the error cases
    try {
      // try authenticating the request
      // NOTE: expecting a `Authorization: Bearer <token>` type header
      await oauth.authenticate(
        new OAuth2Server.Request(req),
        new OAuth2Server.Response(),
      );
    } catch (e) {
      // if an error was thrown, then send it along
      res
        .status(e.statusCode)
        .send({ error: e.name, error_message: e.message });
      return;
    }

    // otherwise assume everything is a-okay
    next();
  },

  // define a handler for creating a token given a client_id, client_secret, and grant_type
  async generate(req, res) {
    let token = null;

    // wrap this in a try/catch block to better handle the errors
    try {
      // map the request to a standard OAuth2Server request body
      const oauthBody = {
        client_id: req.body.client_id,
        client_secret: req.body.client_secret,
        grant_type: req.body.grant_type,
      };

      // figure out the content length to ensure content-type checks pass
      const formBodyLength = Object.entries(oauthBody)
        .map(([a, b]) => `${a}=${b}`)
        .join("&").length;

      // try generating a token
      token = await oauth.token(
        new OAuth2Server.Request({
          body: oauthBody,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": formBodyLength,
          },
          method: "POST",
          query: {},
        }),
        new OAuth2Server.Response(),
      );
    } catch (e) {
      // if we failed, then surface that error in a structured way
      res
        .status(e.statusCode)
        .send({ error: e.name, error_message: e.message });
      return;
    }

    // we should never get here without already returning an error or generating a token
    if (!token) {
      // but if we do, send back a 400
      res.status(400).send({
        error: "invalid_credentials",
        error_message: "Unable to grant token",
      });
      return;
    }

    // if we've come this far then send along the token values
    res.status(200).send({
      access_token: token.accessToken,
      expires_at: token.accessTokenExpiresAt,
      token_type: "Bearer",
    });
  },
};

// setup a route to generate OAuth tokens
app.post("/oauth/token", oauthMiddleware.generate);

// setup a route to check these tokens
app.get("/oauth/check", oauthMiddleware.authenticate, (req, res) => {
  res.status(200).send({ message: "ok" });
});

// setup a simple ping route to ensure things are working
app.get("/ping", (req, res) => {
  res.status(200).send({ message: "pong" });
});

// start the app
const PORT = 3000;
console.log(`App running on port ${PORT}`);
app.listen(PORT);
```
