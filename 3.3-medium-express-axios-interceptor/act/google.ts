/* eslint-disable no-console */
import { EndpointName } from "../definitions";
import { testFramework, StepName } from "../framework";

export const actGoogleEndpoint = (config: { requestDataField1: string }) =>
  testFramework.createStep({
    name: StepName.actGoogleEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: EndpointName.googleMainPage,
        config: async () => ({ params: config }),
      });
      console.log("data from arrange step config", result.response.status);
    },
  });
