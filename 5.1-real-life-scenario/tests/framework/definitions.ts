import HTTPMethod from "http-method-enum";

export enum ApiName {
  agify = "agify",
  app = "app",
}

export enum ApiEndpointName {
  getAge = "getAge",
}
export enum AppEndpointName {
  nameToAge = "nameToAge",
  averageAge = "averageAge",
  averageAgeForName = "averageAgeForName",
  requestsForAge = "requestsForAge",
}

export const mockServerPort = 5545;
export const mockDefinitions = [
  {
    apiName: ApiName.agify,
    endpointName: ApiEndpointName.getAge,
    method: HTTPMethod.GET,
    url: "https://api.agify.io",
  } as const,
];

export type ExpressMockDefinition = {
  apiName: ApiName.agify;
  endpointName: ApiEndpointName.getAge;
  requestParameter: {};
  responseBody: {};
  requestBody: {};
  requestQuery: { name: string };
};

export const apiDefinitions = [
  {
    endpointName: AppEndpointName.requestsForAge,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/requests-for-age",
  } as const,
  {
    endpointName: AppEndpointName.nameToAge,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/name-to-age",
  } as const,
  {
    endpointName: AppEndpointName.averageAge,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/average-age",
  } as const,
  {
    endpointName: AppEndpointName.averageAgeForName,
    apiName: ApiName.app,
    method: HTTPMethod.GET,
    url: "http://app:3000/average-age",
  } as const,
];

export type AxiosApiDefinition =
  | {
      endpointName: AppEndpointName.requestsForAge;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { amount: number };
      requestHeaders: {};
    }
  | {
      endpointName: AppEndpointName.nameToAge;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { age: number };
      requestHeaders: {};
    }
  | {
      endpointName: AppEndpointName.averageAge;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { age: number };
      requestHeaders: {};
    }
  | {
      endpointName: AppEndpointName.averageAgeForName;
      apiName: ApiName.app;
      requestData: {};
      requestQueryParams: {};
      responseData: { age: number };
      requestHeaders: {};
    };
