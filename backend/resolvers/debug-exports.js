console.log('Checking module exports...\n');

const authPath = require.resolve('./auth');
console.log('auth.js path:', authPath);

delete require.cache[authPath];
const auth = require('./auth');
console.log('auth exports keys:', Object.keys(auth));
console.log('auth.Query exists?', !!auth.Query);
console.log('auth.Mutation exists?', !!auth.Mutation);

if (auth.Query) {
  console.log('auth.Query keys:', Object.keys(auth.Query));
}
if (auth.Mutation) {
  console.log('auth.Mutation keys:', Object.keys(auth.Mutation));
}
