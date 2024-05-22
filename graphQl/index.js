const { createYoga } = require('graphql-yoga');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { createServer } = require('http');
const path = require('path');
const fs = require('fs');
const resolvers = require('./resolvers');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    try {
      const decodedToken = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    //   console.log(decodedToken);
      req.user = decodedToken;
    } catch (error) {
        // console.log(error);
      throw new Error('Authentication failed');
    }
  }
  next();
};

const typeDefs = fs.readFileSync(path.resolve(__dirname, 'schema.graphql'), 'utf8');

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema,
  context: ({ request }) => ({ ...request }),
  maskedErrors: false,
  graphqlEndpoint: '/graphql',
});

const server = createServer((req, res) => {
  if (req.url.startsWith('/graphql')) {
    authenticate(req, res, () => yoga.handle(req, res));
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(4000, () => {
  console.log('Server is running on http://localhost:4000');
});
