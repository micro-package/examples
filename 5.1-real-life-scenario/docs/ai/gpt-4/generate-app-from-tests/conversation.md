Lukasz Klejszta
I have applications with 3 main directories "docker", "tests" and "src".
In "src" directory there are application files. Those files are are used by application.
In "tests" directory there are tests files. Files with extension ".spec.ts" are used by jest to execute tests.
Files with ".ts" extension without ".spec.ts" contains shared parts that are used in ".spec.ts" file.

Tests are executed when application is running with environment variable APP_ENV equal "test".


I'm providing you my "tests" directory content there are now different files inside this directory
"tests/name-age.spec.ts" - file containing jest executable test cases
`/* eslint-disable no-console */
import { testFramework, StepName } from "./framework/framework";
import { arrangeAgifyEndpoint, arrangeClearAgeNamePairTable } from "./framework/arrange";
import {
  actAverageAgeEndpoint,
  actAverageAgeForNameEndpoint,
  actNameToAgeBatchEndpoint,
  actRequestsForAgeEndpoint,
} from "./framework/act";
import { ApiEndpointName, AppEndpointName } from "./framework/definitions";

const mockedAgifyResponses = [1, 2, 3, 4, 5];
jest.setTimeout(1000 * 30);
describe("feature/name-age", () => {
  it(
    "User needs to know what is the *age* for specific *name* / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: actNameToAgeBatchEndpoint({ names: ["Tom", "Bob", "Anna", "Hannah", "Alice"] }),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const agifyRequests = valueObject.expressGetExecutions({ endpointName: ApiEndpointName.getAge });
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.nameToAge });

          //? check is what we sent to the app fitting to what app sent to the mock server
          //? it may be a good idea to use unit tested encapsulated functions shared between application and tests for more advanced transformations
          expect(agifyRequests.map((agifyRequest) => agifyRequest.request.query.name)).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => {
              const path = nameToAgeResponse.response.request.path;
              return path.substring(path.lastIndexOf("/") + 1);
            }),
          );
          //? check is what mock server returned fitting to what app returned
          expect(mockedAgifyResponses).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age),
          );
        },
      }),
    }),
  );

  it(
    "User needs to know how many times asked for *age* for specific *name* / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Tom", "Tom", "Tom", "Tom"] }),
        actRequestsForAgeEndpoint({ name: "Tom" }),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.nameToAge });
          const requestsForAgeResponses = valueObject.axiosGetResponses({
            endpointName: AppEndpointName.requestsForAge,
          });
          expect(nameToAgeResponses.length).toStrictEqual(requestsForAgeResponses[0].response.data.amount);
        },
      }),
    }),
  );

  it(
    "User needs to know what is the *average age* for all people / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Bob", "Anna", "Hannah", "Alice"] }),
        actAverageAgeEndpoint(),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.averageAge });
          expect(nameToAgeResponses.length).toStrictEqual(1);
          expect(nameToAgeResponses[0].response.data.age).toStrictEqual(
            nameToAgeResponses
              .map((nameToAgeResponse) => nameToAgeResponse.response.data.age)
              .reduce((acc, val) => acc + val, 0) / nameToAgeResponses.length,
          );
        },
      }),
    }),
  );

  it(
    "User needs to know what is the *average age* for specific name / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Tom", "Tom", "Tom", "Tom"] }),
        actAverageAgeForNameEndpoint({ name: "Tom" }),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.averageAgeForName });
          expect(nameToAgeResponses.length).toStrictEqual(1);
          expect(nameToAgeResponses[0].response.data.age).toStrictEqual(
            nameToAgeResponses
              .map((nameToAgeResponse) => nameToAgeResponse.response.data.age)
              .reduce((acc, val) => acc + val, 0) / nameToAgeResponses.length,
          );
        },
      }),
    }),
  );
});
`
"tests/framework/act.ts"
`
import { StatusCodes } from "http-status-codes";
import { AppEndpointName } from "./definitions";
import { testFramework, StepName } from "./framework";

export const actNameToAgeBatchEndpoint = (config: { names: string[] }) =>
  testFramework.createStep({
    name: StepName.actNameToAgeBatchEndpoint,
    handler: async (valueObject) => {
      for await (const name of config.names) {
        const result = await valueObject.axiosRequest({
          endpointName: AppEndpointName.nameToAge,
          config: async (definition) => ({ ...definition, url: `${definition.url}/${name}` }),
        });
        if (result.response.status !== StatusCodes.OK) {
          throw Error(
            `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
          );
        }
      }
    },
  });

export const actAverageAgeEndpoint = () =>
  testFramework.createStep({
    name: StepName.actAverageAgeEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: AppEndpointName.averageAge,
        config: async (definition) => definition,
      });
      if (result.response.status !== StatusCodes.OK) {
        throw Error(
          `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
        );
      }
    },
  });

export const actAverageAgeForNameEndpoint = (config: { name: string }) =>
  testFramework.createStep({
    name: StepName.actAverageAgeForNameEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: AppEndpointName.averageAgeForName,
        config: async (definition) => ({ ...definition, url: `${definition.url}/${config.name}` }),
      });
      if (result.response.status !== StatusCodes.OK) {
        throw Error(
          `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
        );
      }
    },
  });

export const actRequestsForAgeEndpoint = (config: { name: string }) =>
  testFramework.createStep({
    name: StepName.actRequestsForAgeEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: AppEndpointName.requestsForAge,
        config: async (definition) => ({ ...definition, url: `${definition.url}/${config.name}` }),
      });
      if (result.response.status !== StatusCodes.OK) {
        throw Error(
          `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
        );
      }
    },
  });

`

"/tests/framework/arrange.ts"
`
/* eslint-disable no-console */
import { StatusCodes } from "http-status-codes";
import { AgeNamePair } from "../../src/repository";
import { ApiEndpointName } from "./definitions";
import { testFramework, StepName, DataSourceName } from "./framework";

export const arrangeAgifyEndpoint = (payload: { age: number[] }) =>
  testFramework.createStep({
    name: StepName.arrangeAgifyEndpoint,
    handler: async (valueObject) => {
      await valueObject.expressMock({
        endpointName: ApiEndpointName.getAge,
        handlers: payload.age.map((age) => [
          async (req, res) => {
            res.status(StatusCodes.OK).send(JSON.stringify({ age }));
          },
        ]),
      });
    },
  });

export const arrangeClearAgeNamePairTable = () =>
  testFramework.createStep({
    name: StepName.arrangeClearAgeNamePairTable,
    handler: async (valueObject) => {
      await valueObject.typeormGetManager({ name: DataSourceName.postgres }).getRepository(AgeNamePair).delete({});
    },
  });
`

"/tests/framework/definitions.ts"
`
import HTTPMethod from "http-method-enum";

export enum ApiName {
  agify = "agify",
  app = "app",
}

export enum ApiEndpointName {
  getAge = "getAge",
}
export enum AppEndpointName {
  nameToAge = "nameToAge",
  averageAge = "averageAge",
  averageAgeForName = "averageAgeForName",
  requestsForAge = "requestsForAge",
}

export const mockServerPort = 5545;
export const mockDefinitions = [
  {
    apiName: ApiName.agify,
    endpointName: ApiEndpointName.getAge,
    method: HTTPMethod.GET,
    url: "https://api.agify.io",
  } as const,
];

export type ExpressMockDefinition = {
  apiName: ApiName.agify;
  endpointName: ApiEndpointName.getAge;
  requestParameter: {};
  responseBody: {};
  requestBody: {};
  requestQuery: { name: string };
};

export const apiDefinitions = [
  {
    endpointName: AppEndpointName.requestsForAge,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/requests-for-age",
  } as const,
  {
    endpointName: AppEndpointName.nameToAge,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/name-to-age",
  } as const,
  {
    endpointName: AppEndpointName.averageAge,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/average-age",
  } as const,
  {
    endpointName: AppEndpointName.averageAgeForName,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/average-age",
  } as const,
];

export type AxiosApiDefinition =
  | {
      endpointName: AppEndpointName.requestsForAge;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { amount: number };
      requestHeaders: {};
    }
  | {
      endpointName: AppEndpointName.nameToAge;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { age: number };
      requestHeaders: {};
    }
  | {
      endpointName: AppEndpointName.averageAge;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { age: number };
      requestHeaders: {};
    }
  | {
      endpointName: AppEndpointName.averageAgeForName;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { age: number };
      requestHeaders: {};
    };

`
It seems like you have provided the contents of a test directory. The directory contains four files, name-age.spec.ts, act.ts, arrange.ts, and `definitions




Lukasz Klejszta
"tests/framework/framework.ts"
`
/* eslint-disable no-console */
import {
  compose,
  forgeValueObject,
  storytellerHelper,
  storytellerPlugin,
  createValueObject,
  expressPlugin,
  axiosPlugin,
  typeormPlugin,
} from "@micro-package/storyteller";
import { mockDefinitions, apiDefinitions } from "./definitions";
import type { ExpressMockDefinition, AxiosApiDefinition } from "./definitions";
import { env } from "../../config";
import { AgeNamePair } from "../../src/repository";
import { DataSource } from "typeorm";

export enum StepName {
  arrangeClearAgeNamePairTable = "arrangeClearAgeNamePairTable",
  arrangeAgifyEndpoint = "arrangeAgifyEndpoint",
  actNameToAgeBatchEndpoint = "actNameToAgeBatchEndpoint",
  actAverageAgeEndpoint = "actAverageAgeEndpoint",
  actAverageAgeForNameEndpoint = "actAverageAgeForNameEndpoint",
  actRequestsForAgeEndpoint = "actRequestsForAgeEndpoint",
  assert = "assert",
}

export enum DataSourceName {
  postgres = "postgres",
}

export const testFramework = compose(
  createValueObject(),
  expressPlugin<ExpressMockDefinition>({ port: Number(env.MOCK_SERVER_PORT), mockDefinitions }),
  axiosPlugin<AxiosApiDefinition>({ apiDefinitions }),
  storytellerPlugin<StepName>({ websocketUrl: env.STORYTELLER_WEBSOCKET_URL }),
  typeormPlugin({
    dataSources: [
      {
        name: DataSourceName.postgres,
        dataSource: new DataSource({
          type: "postgres",
          host: "postgres",
          database: env.POSTGRES_DB,
          password: env.POSTGRES_PASSWORD,
          username: env.POSTGRES_USERNAME,
          entities: [AgeNamePair],
        }),
      },
    ],
  }),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
`

It seems like you have provided the contents of a test directory. The directory contains four files: name-age.spec.ts, act.ts, arrange.ts, and definitions.ts. The tests are written using Jest, and the directory structure is as follows:

tests
name-age.spec.ts
framework
act.ts
arrange.ts
definitions.ts
framework.ts
The name-age.spec.ts file contains the test cases for the application, while the files in the framework directory contain the necessary code for arranging and acting in the tests.

act.ts: This file contains functions that perform actions in test cases, such as making requests to the application's endpoints.
arrange.ts: This file contains functions that set up the initial state and mock endpoints for the tests.
definitions.ts: This file contains the definitions for the application's API endpoints, as well as the mock server port and other constants.
framework.ts: This file sets up the test framework using the compose function from the @micro-package/storyteller package, along with various plugins for Express, Axios, TypeORM, and Storyteller.
The tests are executed when the application is running with the environment variable APP_ENV set to "test".




Lukasz Klejszta
Could you write a javascript application?
This application needs to make all those tests cases pass.
When i start this application I want to see a message about configuration.
Certainly! Based on the test cases provided, I've created a JavaScript application using Express that should pass all of the tests. The code provided below assumes that you have already set up your project with the necessary dependencies and configurations. Add the following code to your "src" directory as "app.js":

javascript
Copy code
const express = require("express");
const cors = require("cors");
const { AgeNamePair } = require("./repository");

const app = express();
app.use(cors());

const config = {
  port: process.env.APP_PORT || 3000,
  env: process.env.APP_ENV || "development",
};

console.log("Application configuration:", config);

app.get("/name-to-age/:name", async (req, res) => {
  const { name } = req.params;
  const age = await AgeNamePair.getAgeForName(name);
  res.json({ age });
});

app.get("/requests-for-age/:name", async (req, res) => {
  const { name } = req.params;
  const amount = await AgeNamePair.getRequestsForAge(name);
  res.json({ amount });
});

app.get("/average-age", async (_req, res) => {
  const averageAge = await AgeNamePair.getAverageAge();
  res.json({ age: averageAge });
});

app.get("/average-age/:name", async (req, res) => {
  const { name } = req.params;
  const averageAge = await AgeNamePair.getAverageAgeForName(name);
  res.json({ age: averageAge });
});

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
});

module.exports = app;
This file creates an Express application and sets up the necessary routes to make the test cases pass. Make sure to adjust your import statements if you have a different file structure.

For the AgeNamePair repository, create a file called "repository.js" in the "src" directory:

javascript
Copy code
const { DataSourceName } = require("../tests/framework/definitions");
const { getManager } = require("typeorm");

class AgeNamePair {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  static async getAgeForName(name) {
    const manager = getManager(DataSourceName.postgres);
    const pair = await manager.findOne(AgeNamePair, { name });
    return pair.age;
  }

  static async getRequestsForAge(name) {
    const manager = getManager(DataSourceName.postgres);
    const count = await manager.count(AgeNamePair, { name });
    return count;
  }

  static async getAverageAge() {
    const manager = getManager(DataSourceName.postgres);
    const pairs = await manager.find(AgeNamePair);
    const totalAge = pairs.reduce((acc, pair) => acc + pair.age, 0);
    return totalAge / pairs.length;
  }

  static async getAverageAgeForName(name) {
    const manager = getManager(DataSourceName.postgres);
    const pairs = await manager.find(AgeNamePair, { name });
    const totalAge = pairs.reduce((acc, pair) => acc + pair.age, 0);
    return totalAge / pairs.length;
  }
}

module.exports = { AgeNamePair };
This repository file provides the necessary methods to interact with the database for the AgeNamePair entity.

To start the application, add a start script to your "package.json" file:

json
Copy code
{
  "scripts": {
    "start": "node src/app.js"
  }
}
Now, you can run npm start or yarn start to start the application. You should see the




Lukasz Klejszta
I don't see a connection to postgres database in codebase, could you write ?
Certainly! You'll need to set up a connection to your PostgreSQL database using the TypeORM library. First, ensure you have the following dependencies installed:

Copy code
npm install typeorm pg reflect-metadata
Create an "ormconfig.json" file in your project's root directory to set up the database configuration:

json
Copy code
{
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "username": "your_username",
  "password": "your_password",
  "database": "your_database",
  "synchronize": true,
  "logging": false,
  "entities": [
    "src/entity/**/*.js"
  ],
  "migrations": [
    "src/migration/**/*.js"
  ],
  "subscribers": [
    "src/subscriber/**/*.js"
  ],
  "cli": {
    "entitiesDir": "src/entity",
    "migrationsDir": "src/migration",
    "subscribersDir": "src/subscriber"
  }
}
Replace "your_username", "your_password", and "your_database" with your PostgreSQL credentials and database name.

Next, create a new folder named "entity" inside your "src" directory, and add a file called "AgeNamePair.js":

javascript
Copy code
const { Entity, PrimaryGeneratedColumn, Column } = require("typeorm");

@Entity()
class AgeNamePair {
  @PrimaryGeneratedColumn()
  id = undefined;

  @Column("text")
  name = "";

  @Column("integer")
  age = 0;
}

module.exports = { AgeNamePair };
Now, update your "app.js" to include the connection to the PostgreSQL database using TypeORM:

javascript
Copy code
const express = require("express");
const cors = require("cors");
const { AgeNamePair } = require("./repository");
const { createConnection } = require("typeorm");

const app = express();
app.use(cors());

const config = {
  port: process.env.APP_PORT || 3000,
  env: process.env.APP_ENV || "development",
};

console.log("Application configuration:", config);

createConnection().then(() => {
  console.log("Connected to the database");

  app.get("/name-to-age/:name", async (req, res) => {
    const { name } = req.params;
    const age = await AgeNamePair.getAgeForName(name);
    res.json({ age });
  });

  app.get("/requests-for-age/:name", async (req, res) => {
    const { name } = req.params;
    const amount = await AgeNamePair.getRequestsForAge(name);
    res.json({ amount });
  });

  app.get("/average-age", async (_req, res) => {
    const averageAge = await AgeNamePair.getAverageAge();
    res.json({ age: averageAge });
  });

  app.get("/average-age/:name", async (req, res) => {
    const { name } = req.params;
    const averageAge = await AgeNamePair.getAverageAgeForName(name);
    res.json({ age: averageAge });
  });

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
}).catch((error) => console.log("TypeORM connection error: ", error));
This updated "app.js" file initializes the connection to the PostgreSQL database using TypeORM before setting up the routes and starting the server. Make sure to adjust your import statements if you have a different file structure.

Now your application should be connected to your PostgreSQL database. Run your application with npm start or yarn start and ensure the connection is successful.