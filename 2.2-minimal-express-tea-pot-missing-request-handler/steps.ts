/* eslint-disable no-console */
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { testFramework, StepName, EndpointName, ApiName, mockDefinitions } from "./framework";

export const stepArrange = () =>
  testFramework.createStep({
    name: StepName.stepArrange,
    handler: async (valueObject) => {
      await valueObject.expressMock({
        endpointName: EndpointName.googleMainPage,
        handlers: [
          [
            (req, res) => {
              res.sendStatus(StatusCodes.OK);
            },
          ],
        ],
      });
    },
  });

export const stepAct = () =>
  testFramework.createStep({
    name: StepName.stepAct,
    handler: async () => {
      await axios({
        url: `${new URL(mockDefinitions[0].url).origin}/${ApiName.google}${new URL(mockDefinitions[0].url).pathname}`,
        validateStatus: () => true, // don't throw error on statuses other than 2**
      });
    },
  });
