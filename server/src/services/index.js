// services/index.js — route to mock or real service based on env
const isMock = process.env.USE_MOCK === 'true';
module.exports = isMock
  ? require('./mockService')
  : require('./spApiService');
