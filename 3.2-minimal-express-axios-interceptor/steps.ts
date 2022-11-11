/* eslint-disable no-console */
import axios from "axios";
import { testFramework, StepName, EndpointName } from "./framework";
import { externalApi } from "./usage.spec";

export const stepArrange = () =>
  testFramework.createStep({
    name: StepName.stepArrange,
    handler: async (valueObject) => {
      await valueObject.expressMock({
        endpointName: EndpointName.googleMainPage,
        handlers: [
          [
            async (req, res) => {
              console.log("data from act step config", req.query);
              const response = await axios({ url: externalApi.url, params: req.params, validateStatus: () => true });
              console.log("framework used as interceptor, received response from api", response.status, response.data);
              // return what your api consumes
              res.status(response.status).send(response.data);
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
