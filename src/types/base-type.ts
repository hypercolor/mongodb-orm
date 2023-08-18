import { EntityStatus } from '../enums/entity-status';
import { ObjectId } from 'mongodb';

export interface BaseType {
    _id: ObjectId;
    createdAt: Date;
    updatedAt?: Date;
    status: EntityStatus;
}
