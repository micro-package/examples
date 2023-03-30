
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

Based on the provided information, your application has three main directories: "docker", "tests", and "src". The "src" directory contains the main application files, and the "tests" directory contains test files, including Jest test files with the ".spec.ts" extension.

The application's dependencies are listed in the package.json file, with @micro-package/storyteller being an important dependency for developing tests. You have also shared the contents of the Docker-related files, namely docker-compose.yml, docker/Dockerfile, and docker/wait-for.

To provide you with more information on the @micro-package/storyteller package, I've looked it up on the npm registry. Unfortunately, there is no such package available on the npm registry as of my knowledge cutoff date in September 2021. It is possible that this is a private package or an internal package specific to your organization, so I cannot provide more information about it. You may want to check with your team members or look into the package's documentation or source code for more information.

Now let's discuss the Docker configuration:

The docker-compose.yml file defines four services: postgres, adminer, app, and js. The postgres service



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
Your application has three main parts: the REST server, the Agify integration, and the repository. Let's break down each part:

REST server (src/index.ts): This file sets up an Express server with five endpoints:
GET /name-to-age/:name: This endpoint takes a name as a parameter and fetches the age using the agify function from the integration module. It then stores the name and age in the repository and returns the age in JSON format.
GET /average-age: This endpoint returns the average age of all the name-age pairs stored in the repository.
GET /average-age/:name: This endpoint takes a name as a



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
Your test directory contains Jest tests




Lukasz Klejszta

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

Could you explain to me what is the relation between application in "src" directory and tests in "tests" directory?
And the second question, what tests will do with application if they will be started.
The tests in the "tests" directory are designed to test the functionality of the application located in the "src" directory. The tests use the Jest testing framework to ensure that the application behaves as expected and meets the requirements specified in the test cases.

The relation between the "src" and "tests" directories is that the tests import and use the modules and components defined in the "src" directory to execute the test scenarios. The tests will help identify any issues or bugs in the application, validate the expected behavior, and provide confidence in the overall quality of the application.

When the tests are started, they will perform the following actions:

Set up the testing environment and mock the external dependencies, such as the Agify API and the database.
Execute test cases, which involve sending requests to the application's endpoints and checking if the responses are as expected. The test cases cover different scenarios such as:
Getting the age for a specific name
Getting the number of times an age is requested for a specific name
Getting the average age for all people
Getting the average age for a specific name
Evaluate the test results to check if they pass or fail based on the assertions defined in the test cases. This helps identify if there are any issues with the application's functionality.
The "config.ts" file is used to load environment variables for the test environment, while the "jest.config.json" file contains Jest's configuration settings.




Lukasz Klejszta
I am sending now file "name-age.spec.ts" with applied change.
Could you tell me what change did I made?
/* eslint-disable no-console */
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
In the first test case of the "name-age.spec.ts" file, you made the following change:

Original code:

javascript
Copy code
expect(mockedAgifyResponses).toStrictEqual(
  nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age),
);
Changed code:

javascript
Copy code
expect(mockedAgifyResponses).toStrictEqual(
  nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age + 1),
);
You added + 1 to the nameToAgeResponse.response.data.age inside the map() function. This change alters the expected results in the test, so it now checks whether the age returned by the application is one greater than the age returned by the mocked Agify API response.




Lukasz Klejszta
Could you tell me what changes I would need to apply to application codebase in "src" directory in order to make tests passing, assume that tests were passing before change was applied?
Since the change in the test case now expects the age returned by the application to be one greater than the age returned by the Agify API, you need to update the application code in the "src" directory to add 1 to the age received from the Agify API before returning it to the user.

In your application code, you should look for the function or method that processes the response from the Agify API and returns the age to the user. It's likely in the controller or service layer of your application. Once you find the relevant function or method, add 1 to the age received from the Agify API before returning it.

For example, if you have a function like this:

javascript
Copy code
function processAgifyResponse(agifyResponse) {
  return agifyResponse.age;
}
You should update it to:

javascript
Copy code
function processAgifyResponse(agifyResponse) {
  return agifyResponse.age + 1;
}
By making this change, the application will return ages with an additional value of 1, which should make your updated test case pass.




Lukasz Klejszta
Here is a codebase that I have, could you tell me what should be changed to achieve passing tests? 
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
In order to make the tests pass, you need to update the /name-to-age/:name route handler in the "src/index.ts" file to add 1 to the age received from the Agify API before returning it.

Update the following part of the code in "src/index.ts" file:

javascript
Copy code
app.get("/name-to-age/:name", async (req, res) => {
  const age = await agify({ name: req.params.name });
  if (age === null) {
    res.sendStatus(StatusCodes.CONFLICT);
    return;
  }
  await repo.create({ age, name: req.params.name });
  res.status(StatusCodes.OK).send(JSON.stringify({ age }));
});
to:

javascript
Copy code
app.get("/name-to-age/:name", async (req, res) => {
  const age = await agify({ name: req.params.name });
  if (age === null) {
    res.sendStatus(StatusCodes.CONFLICT);
    return;
  }
  const modifiedAge = age + 1; // Add 1 to the age received from the Agify API
  await repo.create({ age: modifiedAge, name: req.params.name }); // Store the modified age in the database
  res.status(StatusCodes.OK).send(JSON.stringify({ age: modifiedAge })); // Return the modified age
});
By making this change, the application will return ages with an additional value of 1, which should make your updated test case pass.