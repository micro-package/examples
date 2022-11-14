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
