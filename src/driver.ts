import {
  Db,
  MongoClient,
} from 'mongodb';
import { InternalServerError } from '@hypercolor/http-errors';
import { IConnectionOptions } from './interfaces/i-connection-options';

export class Driver {
  constructor(
      private options: IConnectionOptions,
  ) {
    this.client = new MongoClient(this.options.uri);
    if (!this.database) {
      this.database = this.client.db(this.options.databaseName);
    }
  }

  public client: MongoClient;
  public database?: Db;

  public async connect() {
    if (!this.client) {
      this.client = new MongoClient(this.options.uri);
      await this.client.connect();
    }
    if (!this.database) {
      this.database = this.client.db(this.options.databaseName);
    }
    return this.database;
  }


  public async getCollection(collectionName: string) {
    try {
      if (!this.client || !this.database) {
        this.database = await this.connect();
      }

      return this.database.collection(collectionName);
    }
    catch (e) {
      console.log('Failed to get collection: ' + collectionName);

      throw new InternalServerError('Failed to get collection: ' + collectionName);
    }
  }
}
