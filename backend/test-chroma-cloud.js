const { ChromaClient } = require('chromadb');
const client = new ChromaClient({ 
  tenant: 'my_tenant', 
  database: 'my_db', 
  auth: { provider: 'token', credentials: 'key' } 
});
console.log(client.api.api.configuration.basePath);
