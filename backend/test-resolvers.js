const resolvers = require('./resolvers');

console.log('✅ Resolvers loaded successfully!');
console.log('📊 Query operations:', Object.keys(resolvers.Query).length);
console.log('📊 Mutation operations:', Object.keys(resolvers.Mutation).length);

const typeResolvers = Object.keys(resolvers).filter(k => !['Query', 'Mutation', 'Subscription'].includes(k));
console.log('📊 Type resolvers:', typeResolvers.length, ':', typeResolvers.join(', '));

// List some key operations
console.log('\n📝 Sample Query operations:');
console.log('  -', Object.keys(resolvers.Query).slice(0, 5).join(', '), '...');

console.log('\n📝 Sample Mutation operations:');
console.log('  -', Object.keys(resolvers.Mutation).slice(0, 5).join(', '), '...');
