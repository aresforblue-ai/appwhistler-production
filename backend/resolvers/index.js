// Main resolver file - combines all modular resolvers
const authResolvers = require('./auth');
const appsResolvers = require('./apps');
const usersResolvers = require('./users');
const factChecksResolvers = require('./factChecks');
const reviewsResolvers = require('./reviews');
const adminResolvers = require('./admin');
const bountiesResolvers = require('./bounties');
const blockchainResolvers = require('./blockchain');
const truthAnalysisResolvers = require('./truthAnalysis');

// Helper function to merge resolver objects
function mergeResolvers(...resolverModules) {
  const merged = {
    Query: {},
    Mutation: {},
    Subscription: {},
  };

  // Merge all Query, Mutation, and Subscription resolvers
  for (const module of resolverModules) {
    if (module.Query) {
      Object.assign(merged.Query, module.Query);
    }
    if (module.Mutation) {
      Object.assign(merged.Mutation, module.Mutation);
    }
    if (module.Subscription) {
      Object.assign(merged.Subscription, module.Subscription);
    }

    // Merge type resolvers (App, User, FactCheck, etc.)
    for (const [key, value] of Object.entries(module)) {
      if (key !== 'Query' && key !== 'Mutation' && key !== 'Subscription') {
        if (!merged[key]) {
          merged[key] = {};
        }
        Object.assign(merged[key], value);
      }
    }
  }

  return merged;
}

// Combine all resolvers
const resolvers = mergeResolvers(
  authResolvers,
  appsResolvers,
  usersResolvers,
  factChecksResolvers,
  reviewsResolvers,
  adminResolvers,
  bountiesResolvers,
  blockchainResolvers,
  truthAnalysisResolvers
);

module.exports = resolvers;
