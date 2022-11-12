/* eslint-disable no-console */
import { compose, storytellerHelper } from "@micro-package/storyteller";
import { createValueObject, forgeValueObject } from "@micro-package/container/value-object";
import { storytellerPlugin } from "@micro-package/storyteller";
import { expressPlugin } from "@micro-package/express";
import { axiosPlugin } from "@micro-package/axios";
import { typeormPlugin } from "@micro-package/typeorm";
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
  storytellerPlugin<StepName>({}),
  typeormPlugin({
    dataSources: [
      {
        name: DataSourceName.postgres,
        dataSource: new DataSource({
          type: "postgres",
          host: "localhost",
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
