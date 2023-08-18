# Hypercolor MongoDB ORM

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
- [License](LICENSE)
- [More Information](#more-information)
    - [Toolchain](#toolchain)
    - [Project Repository](#project-repository)
    - [Organization Repository](#organization-repository)

## Introduction

This tool is used by the team at Hypercolor Digital to handle query operations for MongoDB. When creating your schema, create a base class that extends the `QueryOperators` class in this package. This will give you access to type safe query operators like `find()`, `updateOne()`, etc. All subsequent schema classes should extend this base class.

## Installation

Install this package using your package manager of choice.

- NPM
    - `npm i @hypercolor/mongodb-orm`
- Yarn
    - `yarn add @hypercolor/mongodb-orm`

## Usage

Create a base class that extends the `QueryOperators` class in this package. This will give you access to type safe query operators like `find()`, `updateOne()`, etc. All subsequent schema classes should extend this base class.

### Step 1: Create your Base Class
Example
```typescript
import 'reflect-metadata';
import { QueryOperators } from '@hypercolor/mongodb-orm';
import {jsonMember, jsonObject} from 'typedjson';
import {ObjectId} from 'mongodb';

/*
   We recommend initializing the base domain with the following key/value pairs.
   Optional: We also use typedjson in our projects to support serialization.
   If you are using typedjson, you can add the following to your base class:
 */

@jsonObject
export class MongoBaseDomain extends QueryOperators {
  constructor() {
    super({
      uri: process.env.MONGO_DB_URI,
      databaseName: process.env.MONGO_DB_NAME
    });
  }
  
  @jsonMember({isRequired: true}) public _id!: ObjectId;
  @jsonMember({isRequired: true}) public createdAt!: Date;
  @jsonMember public updatedAt?: Date;
  @jsonMember({isRequired: true}) public status!: EntityStatus;
}

```

### Step 2: Extend Your Base Class To Create Schema Classes

Now that the base class has been created, simply extend it and add your key/value pairs to create a schema class.

Example:

```typescript
import MongoBaseDomain from './MongoBaseDomain';

@jsonObject
export class User extends MongoBaseDomain {
  @jsonMember({isRequired: true}) public firstName!: string;
  @jsonMember({isRequired: true}) public lastName!: string;
  @jsonMember({isRequired: true}) public emailAddress!: string;
  @jsonMember({isRequired: true}) public password!: string;
}
```

### Step 3: Use Your Schema Class

After creating a class for a specific schema, you can now use the class to perform operations on the database.

Example

```typescript
import { ObjectId } from 'mongodb';
import { User } from './User';
import { NotFoundError } from '@hypercolor/http-errors';

export class UserService {
  public static async findUserById(userId: ObjectId) {
    const user = await User.find({_id: userId}); //returns User | undefined
    return user;
  }
  
  public static async createNewUser(firstName: string, lastName: string, emailAddress: string, password: string) {
    const user = await User.create({
      firstName,
      lastName,
      emailAddress,
      password
    }); // returns a saved User object
    
    return user;
  }
  
  public static async updateUserById(userId: ObjectId, firstName: string, lastName: string, emailAddress: string) {
    const updated = await User.updateOne(
      userId,
      {
        $set: {
          firstName,
          lastName,
          emailAddress
        }
      }
    ); // returns the updated User object
    
    return updated;
  }
  
}
```

## Misc Info

### Toolchain

- TypeScript
- MongoDB
- @hypercolor/http-errors

#### [Project Repository](https://github.com/hypercolor/code-push)

#### [Organization Repository](https://github.com/hypercolor/)
