/* eslint-disable no-console */
import type { AxiosInstance } from "axios";
import axios from "axios";
import { MockEndpointName } from "../../definitions/mock-definition";
import { StepName } from "../../definitions/step";
import { externalApi } from "../../external-api";
import { testFramework } from "../../framework";

export const arrangeGoogleEndpointFactory = (dependencies: { axios: AxiosInstance }) => () =>
  testFramework.createStep({
    name: StepName.arrangeGoogleEndpoint,
    handler: async (valueObject) => {
      await valueObject.expressMock({
        endpointName: MockEndpointName.googleMainPage,
        handlers: [
          [
            async (req, res) => {
              console.log("data from act step config", req.query);
              const response = await dependencies.axios({
                url: externalApi.url,
                params: req.params,
                validateStatus: () => true,
              });
              console.log("framework used as interceptor, received response from api", response.status, response.data);
              // return what your api consumes
              console.log("\n\n\n\n", { res });
              res.status(response.status).send(response.data);
            },
          ],
        ],
      });
    },
  });

export const arrangeGoogleEndpoint = arrangeGoogleEndpointFactory({ axios });
