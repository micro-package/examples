/* eslint-disable no-console */
import { createValueObject, forgeValueObject } from "@micro-package/container/value-object";
import { expressPlugin } from "@micro-package/express";
import { compose, storytellerHelper, storytellerPlugin } from "@micro-package/storyteller";
import HTTPMethod from "http-method-enum";

export enum ApiName {
  google = "google",
  api2 = "api2",
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
  {
    apiName: ApiName.google,
    endpointName: EndpointName.googleMainPage,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/main-page`,
  } as const,
];

export const testFramework = compose(
  createValueObject(),
  storytellerPlugin<StepName>({}),
  expressPlugin<{
    apiName: ApiName.google;
    endpointName: EndpointName.googleMainPage;
    requestParameter: { paramMainPage: string };
    responseBody: {};
    requestBody: {};
    requestQuery: {};
  }>({ port, mockDefinitions }),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
