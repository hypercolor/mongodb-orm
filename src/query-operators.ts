import {
  AggregateOptions,
  ClientSession,
  Document,
  Filter,
  FindOptions,
  MongoClient,
  ObjectId,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
} from 'mongodb';
import { InternalServerError, NotFoundError } from '@hypercolor/http-errors';
import { Driver } from './driver';
import { BaseType } from './types/base-type';
import { EntityStatus } from './enums/entity-status';
import { IConnectionOptions } from './interfaces/i-connection-options';

export class QueryOperators {
  constructor (
      private options: IConnectionOptions,
  ) {
    QueryOperators._driver = new Driver(this.options);
  }
  private static _driver: Driver;

  public static async transaction<T>(operations: (session: ClientSession) => Promise<T>): Promise<void> {
    const client: MongoClient = QueryOperators._driver.client;
    const session: ClientSession = client.startSession();
    try {
      const result = await session.withTransaction(
          async () => operations(session), {
            readPreference: "primary",
            readConcern: { level: "local" },
            writeConcern: { w: 'majority'}
          });
      console.log('Transaction completed. Result: ' + result);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  public static async updateMany<T extends BaseType>(this: new() => T, filter: Filter<Document>, updates: UpdateFilter<Document>, options?: UpdateOptions) {
    const instance = new this();
    Object.assign(instance, updates);
    const document = instance;

    if (!document.createdAt) {
      document.createdAt = new Date();
    }
    document.updatedAt = new Date();

    if (!document.status) {
      document.status = EntityStatus.ACTIVE;
    }

    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      const result: UpdateResult<Document> = await collection.updateMany(
          filter,
          updates,
          options ? {...options, upsert: true} : {upsert: true});
      if (!result) {
        throw new InternalServerError('Failed to save document to collection: ' + collectionName);
      }
      if (!result.acknowledged) {
        throw new InternalServerError('Failed to save document to collection: ' + collectionName);
      }
      return;
    }
    catch (e) {
      console.log("Failed to save document: ", {
        collectionName,
        parameters: updates,
        error: e
      });
      throw new InternalServerError('Failed to save document to collection: ' + collectionName);
    }
  }

  public static async updateOne<T extends BaseType>(this: new() => T, _id: ObjectId, updates?: UpdateFilter<T>, options?: UpdateOptions) {
    const instance = new this();
    Object.assign(instance, updates);
    instance._id = _id;
    const document = instance;

    if (!document.createdAt) {
      document.createdAt = new Date();
    }
    document.updatedAt = new Date();

    if (!document.status) {
      document.status = EntityStatus.ACTIVE;
    }

    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      const result: UpdateResult<Document> = await collection.updateOne(
          {_id},
          updates ? updates : {},
          options ? {...options, upsert: true} : {upsert: true});

      if (!result) {
        throw new InternalServerError('No response from MongoDB, tried to save to collection: ' + collectionName);
      }

      if (!result.acknowledged) {
        throw new InternalServerError('Failed to acknowledge save to collection: ' + collectionName);
      }

      const reloaded = await collection.findOne({_id: document._id || result.upsertedId});
      if (!reloaded) {
        throw new NotFoundError('Failed to reload document from collection: ' + collectionName + ' with ID: ' + result.upsertedId);
      }

      return reloaded as typeof instance;
    }
    catch (e) {
      console.log("Failed to save document: ", {
        collectionName,
        parameters: updates,
        error: e
      });
      throw new InternalServerError('Failed to save document to collection: ' + collectionName);
    }
  }

  public static async countDocuments<T extends BaseType>(this: new() => T, filter: Filter<T>) {
    const instance = new this();
    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      return await collection.countDocuments(filter);
    }
    catch (e) {
      console.log("Failed to count documents: ", {
        collectionName,
        filter,
        error: e
      });
      throw new InternalServerError('Failed to count documents in collection: ' + collectionName);
    }
  }

  public static async create<T extends BaseType>(this: new() => T, parameters?: Partial<T>) {
    const instance = new this();
    Object.assign(instance, parameters);
    const document = instance;

    if (!document.createdAt) {
      document.createdAt = new Date();
    }
    document.updatedAt = new Date();

    if (!document.status) {
      document.status = EntityStatus.ACTIVE;
    }

    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      const result = await collection.insertOne(document);
      if (!result) {
        throw new InternalServerError('No response from MongoDB, tried to save to collection: ' + collectionName);
      }

      if (!result.acknowledged) {
        throw new InternalServerError('Failed to acknowledge save to collection: ' + collectionName);
      }

      if (!result.insertedId) {
        throw new InternalServerError('No insertedId found in save result, tried to save to collection: ' + collectionName);
      }


      const reloaded = await collection.findOne({_id: result.insertedId});
      if (!reloaded) {
        throw new NotFoundError('Failed to reload document from collection: ' + collectionName);
      }

      return reloaded as typeof instance;
    }
    catch (e) {
      console.log("Failed to save document: ", {
        collectionName,
        parameters,
        error: e
      });
      throw new InternalServerError('Failed to save document to collection: ' + collectionName);
    }
  }

  public static async find<T extends BaseType>(this: new() => T, filter: Filter<Document>, options?: FindOptions) {
    const instance = new this();
    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);
    try {
      return await collection.find<typeof instance>(filter, options).toArray();
    }
    catch (e) {
      console.log("Failed to find documents: ", {
        collectionName,
        filter,
        options,
        error: e
      });
      throw new InternalServerError('Failed to find document in collection: ' + collectionName);
    }
  }

  public static async findOne<T extends BaseType>(this: new() => T, filter: Filter<Document>, options?: FindOptions) {
    const instance = new this();
    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      return (await collection.findOne<typeof instance>(filter, options) || undefined);
    }
    catch (e) {
      console.log("Failed to find document: ", {
        collectionName,
        filter,
        options,
        error: e
      });
      throw new InternalServerError('Failed to save document to collection: ' + collectionName);
    }
  }

  public static async getByIdOrFail<T extends BaseType>(this: new() => T, options?: FindOptions) {
    const instance = new this();
    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      const result = (await collection.findOne<typeof instance>({_id: instance._id}, options) || undefined);
      if (!result) {
        throw new NotFoundError('Failed to find document in collection: ' + collectionName);
      }
      return result;
    }
    catch (e) {
      console.log("Failed to find document: ", {
        collectionName,
        filter: {_id: instance._id},
        options,
        error: e
      });
      throw new InternalServerError('Failed to find document to collection: ' + collectionName);
    }
  }

  public static async delete<T extends BaseType>(this: new() => T, filter?: any) {
    const instance = new this();
    const collectionName = (instance.constructor.name).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      await collection.deleteOne(filter);
    }
    catch (e) {
      console.log("Failed to find document: ", {
        collectionName,
        filter,
        error: e
      });
      throw new InternalServerError('Failed to save document to collection: ' + collectionName);
    }
  }

  public static async search<T extends BaseType>(this: new() => T, pipeline?: Document[], options?: AggregateOptions) {
    const instance = new this()
    const collectionName = (typeof instance).toLowerCase();
    if (!collectionName) {
      throw new InternalServerError('Failed to parse collectionType: ' + JSON.stringify(this));
    }
    const collection = await QueryOperators._driver.getCollection(collectionName);

    try {
      const result = collection.aggregate<typeof instance>(pipeline, options);
      return await result.toArray();
    }
    catch (e) {
      console.log("Failed to search for documents: ", {
        collectionName,
        pipeline,
        options,
        error: e
      });
      throw new InternalServerError('Failed to save document to collection: ' + collectionName);
    }
  }
}
