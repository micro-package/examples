import HTTPMethod from "http-method-enum";
import { mockDefinitions } from "./mock-definition";

export enum ApiName {
  google = "google",
}

export enum ApiEndpointName {
  googleMainPage = "googleMainPage",
}

export type AxiosApiDefinition = {
  endpointName: ApiEndpointName.googleMainPage;
  apiName: ApiName.google;
  requestData: {};
  requestQueryParams: { requestDataField1: string };
  responseData: { responseDataField1: string };
  requestHeaders: {};
};

export const apiDefinitions = [
  {
    endpointName: ApiEndpointName.googleMainPage,
    apiName: ApiName.google,
    method: HTTPMethod.GET,
    url: `${new URL(mockDefinitions[0].url).origin}/${ApiName.google}${new URL(mockDefinitions[0].url).pathname}`,
  },
];
