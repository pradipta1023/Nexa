import { MongoClient } from 'mongodb';

class MongoDatabase {
  #client;
  #db;

  constructor(uri, dbName = 'nexa') {
    if (!uri) {
      throw new Error("MONGO_URI must be provided to MongoDatabase.");
    }
    this.#client = new MongoClient(uri);
    this.dbName = dbName;
  }

  async connect() {
    await this.#client.connect();
    this.#db = this.#client.db(this.dbName);
    await this.#createIndexes();
    console.log(`Connected to MongoDB database: ${this.dbName}`);
  }

  async disconnect() {
    if (this.#client) {
      await this.#client.close();
      console.log("Disconnected from MongoDB.");
    }
  }

  get db() {
    if (!this.#db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.#db;
  }
  
  get client() {
    return this.#client;
  }

  // Collections accessors
  get knowledgeBases() {
    return this.db.collection('knowledgeBases');
  }

  get resources() {
    return this.db.collection('resources');
  }

  get conversations() {
    return this.db.collection('conversations');
  }

  get turns() {
    return this.db.collection('turns');
  }

  get cleanupJobs() {
    return this.db.collection('cleanupJobs');
  }

  async #createIndexes() {
    // resources.knowledgeBaseId
    await this.resources.createIndex({ knowledgeBaseId: 1 });
    // resources.status
    await this.resources.createIndex({ status: 1 });
    
    // turns.conversationId + turns.timestamp
    await this.turns.createIndex({ conversationId: 1, timestamp: 1 });
    
    // cleanupJobs.status
    await this.cleanupJobs.createIndex({ status: 1 });
  }
}

export default MongoDatabase;
