/* eslint-disable no-console */
import type { StatusCodes } from "http-status-codes";
import { testFramework, StepName, EndpointName } from "./framework";

export const stepArrange = (statusCode: StatusCodes) =>
  testFramework.createStep({
    name: StepName.stepArrange,
    handler: async (valueObject) => {
      await valueObject.expressMock({
        endpointName: EndpointName.googleMainPage,
        handlers: [
          [
            (req, res) => {
              console.log("data from act step config", req.query);
              res.sendStatus(statusCode);
            },
          ],
        ],
      });
    },
  });

export const stepAct = (config: { requestDataField1: string }) =>
  testFramework.createStep({
    name: StepName.stepAct,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: EndpointName.googleMainPage,
        config: async () => ({ params: config }),
      });
      console.log("data from arrange step config", result.response.status);
    },
  });
