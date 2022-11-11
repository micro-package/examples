/* eslint-disable no-console */
import { testFramework, StepName, EndpointName } from "./framework";

export const stepArrange = testFramework.createStep({
  name: StepName.stepArrange,
  handler: async () => {
    console.log("nothing to arrange!");
  },
});

export const responses: any[] = [];

export const stepAct = testFramework.createStep({
  name: StepName.stepAct,
  handler: async (valueObject) => {
    const axiosResponse = await valueObject.axiosRequest({
      endpointName: EndpointName.googleMainPage,
      config: async (payload) => ({
        url: payload.url,
        method: payload.method,
        data: { requestDataField1: "asd" },
      }),
    });
    responses.push(axiosResponse);
  },
});
