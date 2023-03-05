/* eslint-disable no-console */
import {
  axiosPlugin,
  compose,
  createValueObject,
  expressPlugin,
  forgeValueObject,
  storytellerHelper,
} from "@micro-package/storyteller";
import HTTPMethod from "http-method-enum";
import { storytellerPlugin } from "@micro-package/storyteller";

export enum ApiName {
  google = "google",
}

export enum EndpointName {
  googleMainPage = "googleMainPage",
}

export enum StepName {
  stepArrange = "stepArrange",
  stepAct = "stepAct",
  stepAssert = "stepAssert",
}
const port = 5545;
export const mockDefinitions = [
  {
    apiName: ApiName.google,
    endpointName: EndpointName.googleMainPage,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/main-page`,
  } as const,
];

export const testFramework = compose(
  createValueObject(),
  expressPlugin<{
    apiName: ApiName.google;
    endpointName: EndpointName.googleMainPage;
    requestParameter: {};
    responseBody: {};
    requestBody: {};
    requestQuery: { requestDataField1: string };
  }>({ port, mockDefinitions }),
  axiosPlugin<{
    endpointName: EndpointName.googleMainPage;
    apiName: ApiName.google;
    requestData: {};
    requestQueryParams: { requestDataField1: string };
    responseData: { responseDataField1: string };
    requestHeaders: {};
  }>({
    apiDefinitions: [
      {
        endpointName: EndpointName.googleMainPage,
        apiName: ApiName.google,
        method: HTTPMethod.GET,
        url: `${new URL(mockDefinitions[0].url).origin}/${ApiName.google}${new URL(mockDefinitions[0].url).pathname}`,
      },
    ],
  }),
  storytellerPlugin<StepName>({}),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
