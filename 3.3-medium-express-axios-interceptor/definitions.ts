import HTTPMethod from "http-method-enum";

export enum ApiName {
  google = "google",
}

export enum EndpointName {
  googleMainPage = "googleMainPage",
}

export const port = 5545;
export const mockDefinitions = [
  {
    apiName: ApiName.google,
    endpointName: EndpointName.googleMainPage,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/main-page`,
  } as const,
];

export type ExpressMockDefinition = {
  apiName: ApiName.google;
  endpointName: EndpointName.googleMainPage;
  requestParameter: {};
  responseBody: {};
  requestBody: {};
  requestQuery: { requestDataField1: string };
};

export const apiDefinitions = [
  {
    endpointName: EndpointName.googleMainPage,
    apiName: ApiName.google,
    method: HTTPMethod.GET,
    url: `${new URL(mockDefinitions[0].url).origin}/${ApiName.google}${new URL(mockDefinitions[0].url).pathname}`,
  },
];

export type AxiosApiDefinition = {
  endpointName: EndpointName.googleMainPage;
  apiName: ApiName.google;
  requestData: {};
  requestQueryParams: { requestDataField1: string };
  responseData: { responseDataField1: string };
  requestHeaders: {};
};
