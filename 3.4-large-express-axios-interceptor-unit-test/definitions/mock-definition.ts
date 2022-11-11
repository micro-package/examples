import HTTPMethod from "http-method-enum";

export const port = 5545;

export enum MockName {
  google = "google",
}

export enum MockEndpointName {
  googleMainPage = "googleMainPage",
}

export type ExpressMockDefinition = {
  apiName: MockName.google;
  endpointName: MockEndpointName.googleMainPage;
  requestParameter: {};
  responseBody: {};
  requestBody: {};
  requestQuery: { requestDataField1: string };
};

export const mockDefinitions = [
  {
    apiName: MockName.google,
    endpointName: MockEndpointName.googleMainPage,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/main-page`,
  } as const,
];
