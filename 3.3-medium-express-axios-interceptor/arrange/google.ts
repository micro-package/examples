/* eslint-disable no-console */
import axios from "axios";
import { EndpointName } from "../definitions";
import { testFramework, StepName } from "../framework";
import { externalApi } from "../usage.spec";

export const arrangeGoogleEndpoint = () =>
  testFramework.createStep({
    name: StepName.arrangeGoogleEndpoint,
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
