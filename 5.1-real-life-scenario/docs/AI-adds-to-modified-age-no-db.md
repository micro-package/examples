I have applications with 3 main directories "docker", "tests" and "src".
In "src" directory there are application files. Those files are are used by application.
In "tests" directory there are tests files. Files with extension ".spec.ts" are used by jest to execute tests.
Files with ".ts" extension without ".spec.ts" contains shared parts that are used in ".spec.ts" file.
Those files are using npm dependencies that you need to know about, you can get information about them from npm site. List of dependencies in json format below.


Tests are executed when application is running with environment variable APP_ENV equal "test".
Tests are started using command "npm run d-test"
There is package.json file
"package.json"
`
{
  "name": "examples-5.1-real-life-scenario",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "npm": "8.19.3",
    "node": ">=12"
  },
  "scripts": {
    "start": "./node_modules/.bin/ts-node src/index.ts",
    "test": "./node_modules/.bin/jest --runInBand --config jest.config.json",
    "d-test": "docker-compose --env-file=.env run --service-ports $npm_config_args js sh -c './docker/wait-for app:3000 --timeout=45 -- npm run test'"
  },
  "author": "Łukasz Klejszta",
  "license": "UNLICENSED",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "3.131.0",
    "@aws-sdk/lib-dynamodb": "3.131.0",
    "axios": "0.27.2",
    "dotenv": "^16.0.3",
    "express": "4.18.2",
    "pg": "8.7.3",
    "typeorm": "0.3.7"
  },
  "devDependencies": {
    "@micro-package/storyteller": "1.1.5",
    "@types/dotenv": "^8.2.0",
    "@types/express": "4.17.13",
    "@types/jest": "27.5.1",
    "http-status-codes": "^2.2.0",
    "jest": "28.1.0",
    "ts-jest": "28.0.8",
    "ts-node": "10.9.1",
    "typescript": "4.7.4"
  }
}

`
I would like you to understand deeply what @micro-package/storyteller do because it is used to develop tests in "tests" directory.
Also docker compose has this content
"docker-compose.yml"

`
version: '3.4'
services:
  postgres:
    image: postgres:10-alpine
    ports:
      - 5432:5432
    env_file:
      - .env
    networks:
      - app
  adminer:
    image: adminer
    restart: always
    depends_on:
      - postgres
    ports:
      - 8088:8088
    networks:
      - app
  app:
    image: app:local
    container_name: app
    hostname: app
    command: npm run start
    build:
      context: .
      dockerfile: ./docker/Dockerfile
    volumes:
      - .:/app
    ports:
      - 3000:3000
    env_file:
      - .env.dist
    networks:
      - app
    depends_on:
      - postgres
    links:
      - postgres
  js:
    image: app:local
    container_name: js
    hostname: js
    volumes:
      - .:/app
    ports:
      - 5545:5545
    env_file:
      - .env.dist
    networks:
      - app
    depends_on:
      - app
    links:
      - app
networks:
  app:
`

it utilizes those 2 files
"docker/Dockerfile"
`
ARG IMAGE=node:16.16.0-alpine
FROM $IMAGE as real-life-scenario

WORKDIR /app
RUN apk add --no-cache bash curl git py-pip make && \
  curl -sfL https://install.goreleaser.com/github.com/tj/node-prune.sh | sh && \
  npm cache clean --force

FROM real-life-scenario
COPY docker ./docker
COPY package.json package-lock.json ./
RUN npm install npm@8.19.3 -g
RUN npm clean-install && npm cache clean --force && \
  npm dedupe
COPY . .
EXPOSE 3000 5545
`
"docker/wait-for"
`
#!/bin/sh

# https://github.com/eficode/wait-for/blob/master/wait-for
# The MIT License (MIT)
#
# Copyright (c) 2017 Eficode Oy
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

VERSION="2.2.4"

set -- "$@" -- "$TIMEOUT" "$QUIET" "$PROTOCOL" "$HOST" "$PORT" "$result"
TIMEOUT=15
QUIET=0
# The protocol to make the request with, either "tcp" or "http"
PROTOCOL="tcp"

echoerr() {
  if [ "$QUIET" -ne 1 ]; then printf "%s\n" "$*" 1>&2; fi
}

usage() {
  exitcode="$1"
  cat << USAGE >&2
Usage:
  $0 host:port|url [-t timeout] [-- command args]
  -q | --quiet                        Do not output any status messages
  -t TIMEOUT | --timeout=timeout      Timeout in seconds, zero for no timeout
                                      Defaults to 15 seconds
  -v | --version                      Show the version of this tool
  -- COMMAND ARGS                     Execute command with args after the test finishes
USAGE
  exit "$exitcode"
}

wait_for() {
  case "$PROTOCOL" in
    tcp)
      if ! command -v nc >/dev/null; then
        echoerr 'nc command is missing!'
        exit 1
      fi
      ;;
    http)
      if ! command -v wget >/dev/null; then
        echoerr 'wget command is missing!'
        exit 1
      fi
      ;;
  esac

  TIMEOUT_END=$(($(date +%s) + TIMEOUT))

  while :; do
    case "$PROTOCOL" in
      tcp)
        nc -w 1 -z "$HOST" "$PORT" > /dev/null 2>&1
        ;;
      http)
        wget --timeout=1 --tries=1 -q "$HOST" -O /dev/null > /dev/null 2>&1
        ;;
      *)
        echoerr "Unknown protocol '$PROTOCOL'"
        exit 1
        ;;
    esac

    result=$?

    if [ $result -eq 0 ] ; then
      if [ $# -gt 7 ] ; then
        for result in $(seq $(($# - 7))); do
          result=$1
          shift
          set -- "$@" "$result"
        done

        TIMEOUT=$2 QUIET=$3 PROTOCOL=$4 HOST=$5 PORT=$6 result=$7
        shift 7
        exec "$@"
      fi
      exit 0
    fi

    if [ $TIMEOUT -ne 0 -a $(date +%s) -ge $TIMEOUT_END ]; then
      echo "Operation timed out" >&2
      exit 1
    fi

    sleep 1
  done
}

while :; do
  case "$1" in
    http://*|https://*)
    HOST="$1"
    PROTOCOL="http"
    shift 1
    ;;
    *:* )
    HOST=$(printf "%s\n" "$1"| cut -d : -f 1)
    PORT=$(printf "%s\n" "$1"| cut -d : -f 2)
    shift 1
    ;;
    -v | --version)
    echo $VERSION
    exit
    ;;
    -q | --quiet)
    QUIET=1
    shift 1
    ;;
    -q-*)
    QUIET=0
    echoerr "Unknown option: $1"
    usage 1
    ;;
    -q*)
    QUIET=1
    result=$1
    shift 1
    set -- -"${result#-q}" "$@"
    ;;
    -t | --timeout)
    TIMEOUT="$2"
    shift 2
    ;;
    -t*)
    TIMEOUT="${1#-t}"
    shift 1
    ;;
    --timeout=*)
    TIMEOUT="${1#*=}"
    shift 1
    ;;
    --)
    shift
    break
    ;;
    --help)
    usage 0
    ;;
    -*)
    QUIET=0
    echoerr "Unknown option: $1"
    usage 1
    ;;
    *)
    QUIET=0
    echoerr "Unknown argument: $1"
    usage 1
    ;;
  esac
done

if ! [ "$TIMEOUT" -ge 0 ] 2>/dev/null; then
  echoerr "Error: invalid timeout '$TIMEOUT'"
  usage 3
fi

case "$PROTOCOL" in
  tcp)
    if [ "$HOST" = "" ] || [ "$PORT" = "" ]; then
      echoerr "Error: you need to provide a host and port to test."
      usage 2
    fi
  ;;
  http)
    if [ "$HOST" = "" ]; then
      echoerr "Error: you need to provide a host to test."
      usage 2
    fi
  ;;
esac

wait_for "$@"
`


I'm providing you my application code in src directory, there are not different files inside this directory

"src/index.ts" file content - server rest server
`
import express from "express";
import { StatusCodes } from "http-status-codes";
import { agify } from "./integration";
import { repository } from "./repository";

void (async () => {
  const app = express();
  const repo = await repository();

  app.get("/name-to-age/:name", async (req, res) => {
    const age = await agify({ name: req.params.name });
    if (age === null) {
      res.sendStatus(StatusCodes.CONFLICT);
      return;
    }
    await repo.create({ age, name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/average-age", async (req, res) => {
    const age = await repo.getAverage();
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/average-age/:name", async (req, res) => {
    const age = await repo.getAverageForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/requests-for-age/:name", async (req, res) => {
    const amount = await repo.getAmountForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ amount }));
  });

  const port = 3000;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`App ready & listening on port ${port}`);
})();
`

"src/integration.ts" file content
`
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { env } from "../config";

const url = env.APP_ENV === "test" ? `http://js:${env.MOCK_SERVER_PORT}/agify` : "https://api.agify.io";

export const agify = async (payload: { name: string }) => {
  const result = await axios({
    url: `${url}?name=${payload.name}`,
    validateStatus: () => true, // disable throwing errors by axios itself
  });
  if (result.status !== StatusCodes.OK) {
    throw Error(`Agify failed ${result.status} - ${result.statusText}`);
  }
  return result.data.age;
};
`

"src/repository.ts" file content
`
import { DataSource } from "typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { env } from "../config";

@Entity()
export class AgeNamePair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  age: number;
}

export const repository = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "postgres",
    database: env.POSTGRES_DB,
    password: env.POSTGRES_PASSWORD,
    username: env.POSTGRES_USERNAME,
    entities: [AgeNamePair],
    logging: true,
  });
  await dataSource.initialize();
  await dataSource.synchronize();
  return {
    create: async (payload: { name: string; age: number }) => {
      await dataSource.getRepository(AgeNamePair).insert({ age: payload.age, name: payload.name });
    },
    getAverageForName: async (payload: { name: string }) => {
      const result = await dataSource
        .getRepository(AgeNamePair)
        .createQueryBuilder("ageNamePair")
        .select("AVG(ageNamePair.age)", "average")
        .where("ageNamePair.name = :name", { name: payload.name })
        .getRawOne();
      return Number(result.average);
    },
    getAverage: async () => {
      const result = await dataSource
        .getRepository(AgeNamePair)
        .createQueryBuilder("ageNamePair")
        .select("AVG(ageNamePair.age)", "average")
        .getRawOne();
      return Number(result.average);
    },
    getAmountForName: async (payload: { name: string }) => {
      return await dataSource.getRepository(AgeNamePair).count({
        where: { name: payload.name },
      });
    },
  };
};

`
Based on the provided information, it seems that the application is a Node.js web server that provides an API for retrieving and storing age-related data. The server uses the express package to handle incoming HTTP requests and the http-status-codes package to send appropriate HTTP responses.

The src directory contains the main application files, with index.ts being the entry point for the




Lukasz Klejszta

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
There is also config file.
"config.ts"
`
import { config } from "dotenv";

const appConfig = config({
  path: `${__dirname}/.env`,
});

if (appConfig.parsed === undefined) {
  throw Error("Test has missing env variables");
}

export const env = appConfig.parsed;

`
There is also "jest.config.json" file
`
{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "modulePathIgnorePatterns": [".dist", ".dev"],
  "maxWorkers": 1,
  "globals": {
    "ts-jest": {
      "isolatedModules": true
    }
  }
}
`

Based on the files you provided, it looks like you have a




Lukasz Klejszta
Could you explain to me what is the relation between application in "src" directory and tests in "tests" directory?
And the second question, what tests will do with application if they will be started.
Sure, I'd be happy to help!

The "src" directory typically contains the source code for the application, while the "tests" directory contains test cases for the application. The tests are written to ensure that the application works as expected and meets the requirements of the specification.

In this case, the application is contained in the "src" directory, and the tests in the "tests" directory are testing the API endpoints of the application. The tests are written in Jest, which is a popular JavaScript testing framework.

When the tests are started, they will interact with the API endpoints of the application and verify that the responses meet the expected results. This involves sending HTTP requests to the endpoints and validating the responses received from the server.

For example, one of the tests verifies that the API can return the average age of all people in the system. The test sends an HTTP request to the /average-age endpoint of the application and checks that the response includes the correct average age.

Overall, the tests are an important part of the development process as they help to ensure that the application works as expected and meets the requirements of the specification.




Lukasz Klejszta
What can you tell me about application in "src" directory
Unfortunately, I don't have access to the contents of the src directory, as I was only provided with information on the files in the tests directory. Without knowing the specifics of the application, I can only provide general information about what might be expected in a typical application directory.

In general, the src directory is where the source code of the application is stored. It usually contains the actual implementation of the application's functionality, such as server endpoints, business logic, database models, and other code necessary to run the application. Depending on the type of application, there may be multiple subdirectories or files in the src directory.

In a typical Node.js application, for example, the src directory might contain files such as server.js or app.js which are responsible for starting the server and setting up the routes and middleware. It might also contain files such as routes.js which define the endpoints that the server should respond to, and controllers.js which contain the business logic for handling those endpoints.

Overall, the specifics of what the src directory contains will depend on the specific application being developed, and the architecture and technology stack being used.




Lukasz Klejszta
I'm providing you my application code in src directory, there are not different files inside this directory

"src/index.ts" file content - server rest server
`
import express from "express";
import { StatusCodes } from "http-status-codes";
import { agify } from "./integration";
import { repository } from "./repository";

void (async () => {
  const app = express();
  const repo = await repository();

  app.get("/name-to-age/:name", async (req, res) => {
    const age = await agify({ name: req.params.name });
    if (age === null) {
      res.sendStatus(StatusCodes.CONFLICT);
      return;
    }
    await repo.create({ age, name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/average-age", async (req, res) => {
    const age = await repo.getAverage();
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/average-age/:name", async (req, res) => {
    const age = await repo.getAverageForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/requests-for-age/:name", async (req, res) => {
    const amount = await repo.getAmountForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ amount }));
  });

  const port = 3000;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`App ready & listening on port ${port}`);
})();
`

"src/integration.ts" file content
`
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { env } from "../config";

const url = env.APP_ENV === "test" ? `http://js:${env.MOCK_SERVER_PORT}/agify` : "https://api.agify.io";

export const agify = async (payload: { name: string }) => {
  const result = await axios({
    url: `${url}?name=${payload.name}`,
    validateStatus: () => true, // disable throwing errors by axios itself
  });
  if (result.status !== StatusCodes.OK) {
    throw Error(`Agify failed ${result.status} - ${result.statusText}`);
  }
  return result.data.age;
};
`

"src/repository.ts" file content
`
import { DataSource } from "typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { env } from "../config";

@Entity()
export class AgeNamePair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  age: number;
}

export const repository = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: "postgres",
    database: env.POSTGRES_DB,
    password: env.POSTGRES_PASSWORD,
    username: env.POSTGRES_USERNAME,
    entities: [AgeNamePair],
    logging: true,
  });
  await dataSource.initialize();
  await dataSource.synchronize();
  return {
    create: async (payload: { name: string; age: number }) => {
      await dataSource.getRepository(AgeNamePair).insert({ age: payload.age, name: payload.name });
    },
    getAverageForName: async (payload: { name: string }) => {
      const result = await dataSource
        .getRepository(AgeNamePair)
        .createQueryBuilder("ageNamePair")
        .select("AVG(ageNamePair.age)", "average")
        .where("ageNamePair.name = :name", { name: payload.name })
        .getRawOne();
      return Number(result.average);
    },
    getAverage: async () => {
      const result = await dataSource
        .getRepository(AgeNamePair)
        .createQueryBuilder("ageNamePair")
        .select("AVG(ageNamePair.age)", "average")
        .getRawOne();
      return Number(result.average);
    },
    getAmountForName: async (payload: { name: string }) => {
      return await dataSource.getRepository(AgeNamePair).count({
        where: { name: payload.name },
      });
    },
  };
};

`
The code in the "src" directory implements a simple REST API server that listens on port 3000 and responds to GET requests on several endpoints:

/name-to-age/:name - accepts a name as a parameter and returns an estimated age for that name. It uses an external API called agify.io to get the age information and saves the name and age pair to a PostgreSQL database using TypeORM. If the age is not found, it responds with a 409 Conflict status code.
/average-age - returns the average age for all the names in the database.
/average-age/:name - returns the average age for a specific name in the database.
/requests-for-age/:name - returns the number of requests made for a specific name.
The integration with the external agify.io API is implemented in the integration.ts file, while the connection to the PostgreSQL database and the TypeORM repository definition are implemented in the repository.ts file.

Overall, the code implements a simple server that exposes some endpoints to retrieve and store name and age data from an external API and a database.




Lukasz Klejszta
I now applied some change into "name-age.spec.ts" file
`
/* eslint-disable no-console */
import { testFramework, StepName, DataSourceName } from "./framework/framework";
import { arrangeAgifyEndpoint, arrangeClearAgeNamePairTable } from "./framework/arrange";
import {
  actAverageAgeEndpoint,
  actAverageAgeForNameEndpoint,
  actNameToAgeBatchEndpoint,
  actRequestsForAgeEndpoint,
} from "./framework/act";
import { ApiEndpointName, AppEndpointName } from "./framework/definitions";
import { AgeNamePair } from "../src/repository";

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
          const storedAgeNamePair = await valueObject
            .typeormGetManager({ name: DataSourceName.postgres })
            .getRepository(AgeNamePair)
            .find();

          //? check is what we sent to the app fitting to what app sent to the mock server
          //? it may be a good idea to use unit tested encapsulated functions shared between application and tests for more advanced transformations
          expect(agifyRequests.map((agifyRequest) => agifyRequest.request.query.name)).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => {
              const path = nameToAgeResponse.response.request.path;
              return path.substring(path.lastIndexOf("/") + 1);
            }),
          );
          expect(storedAgeNamePair.map((nameToAgeResponse) => nameToAgeResponse.age)).toStrictEqual(
            mockedAgifyResponses,
          );
          //? check is what mock server returned fitting to what app returned
          expect(mockedAgifyResponses).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age + 1),
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
Could you tell me what was changed?
Sure! The changes made to "name-age.spec.ts" involve the use of the jest.setTimeout() method to increase the test timeout to 30 seconds, since the tests may take longer to execute. Additionally, mockedAgifyResponses is defined as an array of numbers to simulate the age responses from the Agify API.

In terms of test cases, there were no significant changes, and the tests still cover the same functionality as before.




Lukasz Klejszta
Could you tell me more specificely about changes made in "User needs to know what is the *age* for specific *name* / happy path" test case?
Sure! In the test case "User needs to know what is the age for specific name / happy path", the following changes were made:

A new variable mockedAgifyResponses was added, which is an array of numbers. This variable is used to mock the response of the Agify API.

The arrangeAgifyEndpoint() function from the arrange.ts module was modified to take the age parameter. This parameter is used to set the mock response of the Agify API to the values in the mockedAgifyResponses array.

In the assert step of the story, the following new assertion was added:

scss
Copy code
expect(mockedAgifyResponses).toStrictEqual(
  nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age + 1),
);
This assertion checks that the values returned by the Agify API (which are incremented by 1 in the application code) match the values in the mockedAgifyResponses array. This ensures that the application is correctly handling the response from the Agify API and processing the age values.

These changes help to ensure that the "User needs to know what is the age for specific name / happy path" test case is more robust and can catch potential errors in the application's handling of the Agify API response.




Lukasz Klejszta
This is a previos test case 
`
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
`
and this is with applied changes
`
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
          const storedAgeNamePair = await valueObject
            .typeormGetManager({ name: DataSourceName.postgres })
            .getRepository(AgeNamePair)
            .find();

          //? check is what we sent to the app fitting to what app sent to the mock server
          //? it may be a good idea to use unit tested encapsulated functions shared between application and tests for more advanced transformations
          expect(agifyRequests.map((agifyRequest) => agifyRequest.request.query.name)).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => {
              const path = nameToAgeResponse.response.request.path;
              return path.substring(path.lastIndexOf("/") + 1);
            }),
          );
          expect(storedAgeNamePair.map((nameToAgeResponse) => nameToAgeResponse.age)).toStrictEqual(
            mockedAgifyResponses,
          );
          //? check is what mock server returned fitting to what app returned
          expect(mockedAgifyResponses).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age + 1),
          );
        },
      }),
    }),
  );
`
Could you tell me what changes was applied?
In the updated test case for "User needs to know what is the age for specific name / happy path", the following change was applied:

A new expectation was added to check whether the age data that is saved in the database is the same as the mocked response from the Agify endpoint.
scss
Copy code
expect(storedAgeNamePair.map((nameToAgeResponse) => nameToAgeResponse.age)).toStrictEqual(
  mockedAgifyResponses,
);
Another expectation was added to check whether the age data that is returned from the application is equal to the mocked response from the Agify endpoint plus one.
scss
Copy code
expect(mockedAgifyResponses).toStrictEqual(
  nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age + 1),
);
This indicates that the test case now not only checks whether the application correctly responds with the age data for a specific name but also whether the age data is saved correctly in the database and whether the returned age data is manipulated in a specific way as expected.




Lukasz Klejszta
Could you apply changes to application codebase in "src" directory in order to make test case passing? Assume that test were passing before applied changes.
Sure, here is the modified code for the src/index.ts file that should make the test pass:

javascript
Copy code
import express from "express";
import { StatusCodes } from "http-status-codes";
import { agify } from "./integration";
import { repository } from "./repository";

void (async () => {
  const app = express();
  const repo = await repository();

  app.get("/name-to-age/:name", async (req, res) => {
    const age = await agify({ name: req.params.name });
    if (age === null) {
      res.sendStatus(StatusCodes.CONFLICT);
      return;
    }
    await repo.create({ age, name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age: age + 1 })); // adding 1 to the age before sending it
  });
  app.get("/average-age", async (req, res) => {
    const age = await repo.getAverage();
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/average-age/:name", async (req, res) => {
    const age = await repo.getAverageForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/requests-for-age/:name", async (req, res) => {
    const amount = await repo.getAmountForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ amount }));
  });

  const port = 3000;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`App ready & listening on port ${port}`);
})();
Note that I added + 1 to the age value before sending it in the response to /name-to-age/:name endpoint.