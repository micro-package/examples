/* eslint-disable no-console */
import { testFramework, StepName, EndpointName } from "./framework";

export const stepArrange = (options: { text: string }) =>
  testFramework.createStep({
    name: StepName.stepArrange,
    handler: async () => {
      console.log(`nothing to arrange and "${options.text}"!`);
    },
  });

export const responses: any[] = [];

export const stepAct = (options: { data: string }) =>
  testFramework.createStep({
    name: StepName.stepAct,
    handler: async (valueObject) => {
      const axiosResponse = await valueObject.axiosRequest({
        endpointName: EndpointName.googleMainPage,
        config: async () => ({
          data: { requestDataField1: options.data },
        }),
      });
      responses.push(axiosResponse);
    },
  });
