console.log('Testing module loading individually...\n');

const authResolvers = require('./resolvers/auth');
console.log('auth loaded - Query keys:', Object.keys(authResolvers.Query || {}));
console.log('auth loaded - Mutation keys:', Object.keys(authResolvers.Mutation || {}));

const appsResolvers = require('./resolvers/apps');
console.log('\napps loaded - Query keys:', Object.keys(appsResolvers.Query || {}));

console.log('\n--- Testing merge function ---\n');

function mergeResolvers(...resolverModules) {
  console.log('Merging', resolverModules.length, 'modules');
  const merged = {
    Query: {},
    Mutation: {},
    Subscription: {},
  };

  for (let i = 0; i < resolverModules.length; i++) {
    const module = resolverModules[i];
    console.log(`Module ${i}:`, Object.keys(module));

    if (module.Query) {
      console.log(`  - Merging Query with ${Object.keys(module.Query).length} keys`);
      Object.assign(merged.Query, module.Query);
    }
    if (module.Mutation) {
      console.log(`  - Merging Mutation with ${Object.keys(module.Mutation).length} keys`);
      Object.assign(merged.Mutation, module.Mutation);
    }
  }

  console.log('\nMerged result:');
  console.log('  - Query keys:', Object.keys(merged.Query).length);
  console.log('  - Mutation keys:', Object.keys(merged.Mutation).length);

  return merged;
}

const merged = mergeResolvers(authResolvers, appsResolvers);
console.log('\nFinal merged Query keys:', Object.keys(merged.Query));
console.log('Final merged Mutation keys:', Object.keys(merged.Mutation));
