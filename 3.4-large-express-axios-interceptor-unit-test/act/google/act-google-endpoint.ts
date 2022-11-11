/* eslint-disable no-console */

import { ApiEndpointName } from "../../definitions/api-definition";
import { StepName } from "../../definitions/step";
import { testFramework } from "../../framework";

export const actGoogleEndpoint = (config: { requestDataField1: string }) =>
  testFramework.createStep({
    name: StepName.actGoogleEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: ApiEndpointName.googleMainPage,
        config: async () => ({ params: config }),
      });
      console.log("data from arrange step config", result.response.status);
    },
  });
