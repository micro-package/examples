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
