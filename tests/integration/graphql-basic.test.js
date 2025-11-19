const express = require('express');
const request = require('supertest');
const { ApolloServer } = require('apollo-server-express');
const { newDb } = require('pg-mem');

const typeDefs = require('../../src/backend/schema');
const resolvers = require('../../src/backend/resolvers');
const { createBatchLoaders } = require('../../src/backend/utils/dataLoader');

function createTestPool() {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  db.public.registerFunction({
    name: 'now',
    returns: 'timestamp',
    implementation: () => new Date()
  });

  db.public.none(`
    CREATE TABLE apps (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      package_id TEXT,
      category TEXT,
      truth_rating NUMERIC,
      download_count INTEGER,
      description TEXT,
      is_verified BOOLEAN DEFAULT false,
      platform TEXT DEFAULT 'android',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  db.public.none(`
    INSERT INTO apps (id, name, package_id, category, truth_rating, download_count, description, is_verified)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 'Secure Chat', 'com.chat.secure', 'social', 4.6, 20000, 'Encrypted messaging app', true),
      ('22222222-2222-2222-2222-222222222222', 'Sketchy VPN', 'com.vpn.bad', 'security', 1.2, 5000, 'VPN with poor transparency', false);
  `);

  const { Pool } = db.adapters.createPg();
  return new Pool();
}

describe('GraphQL integration', () => {
  let app;
  let server;
  let pool;

  beforeAll(async () => {
    pool = createTestPool();

    app = express();
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => ({
        pool,
        req,
        loaders: createBatchLoaders(pool)
      })
    });

    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });
  });

  afterAll(async () => {
    await server.stop();
    await pool.end();
  });

  test('trendingApps query returns only verified apps ordered by downloads', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({ query: '{ trendingApps { name downloadCount truthRating } }' })
      .expect(200);

    if (response.body.errors) {
      console.log('GraphQL errors:', response.body.errors);
    }

    expect(response.body.data.trendingApps).toHaveLength(1);
    expect(response.body.data.trendingApps[0]).toMatchObject({
      name: 'Secure Chat',
      downloadCount: 20000
    });
  });

  test('apps query supports search and pagination response shape', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `{
          apps(search: "Secure", limit: 5, offset: 0) {
            edges { name category }
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          }
        }`
      })
      .expect(200);

    if (response.body.errors) {
      console.log('GraphQL errors:', response.body.errors);
    }

    expect(response.body.data.apps.edges).toHaveLength(1);
    expect(response.body.data.apps.edges[0].name).toBe('Secure Chat');
    expect(response.body.data.apps.pageInfo.hasNextPage).toBe(false);
  });
});
