import HTTPMethod from "http-method-enum";

export enum ApiName {
  generator = "generator",
}

export enum EndpointName {
  number = "number",
  street = "street",
  zipCode = "zipCode",
  city = "city",
}

export const port = 5545;
export const mockDefinitions = [
  {
    apiName: ApiName.generator,
    endpointName: EndpointName.number,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/number`,
  } as const,
  {
    apiName: ApiName.generator,
    endpointName: EndpointName.street,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/street`,
  } as const,
  {
    apiName: ApiName.generator,
    endpointName: EndpointName.zipCode,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/zipCode`,
  } as const,
  {
    apiName: ApiName.generator,
    endpointName: EndpointName.city,
    method: HTTPMethod.GET,
    url: `http://localhost:${port}/city`,
  } as const,
];

export type ExpressMockDefinition =
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.number;
      requestParameter: {};
      responseBody: {};
      requestBody: {};
      requestQuery: {};
    }
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.city;
      requestParameter: {};
      responseBody: {};
      requestBody: {};
      requestQuery: {};
    }
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.street;
      requestParameter: {};
      responseBody: {};
      requestBody: {};
      requestQuery: {};
    }
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.zipCode;
      requestParameter: {};
      responseBody: {};
      requestBody: {};
      requestQuery: {};
    };

const buildApiUrl = (url: string) => `${new URL(url).origin}/${ApiName.generator}${new URL(url).pathname}`;

export const apiDefinitions = [
  {
    endpointName: EndpointName.number,
    apiName: ApiName.generator,
    method: HTTPMethod.GET,
    url: buildApiUrl(mockDefinitions[0].url),
  },
  {
    endpointName: EndpointName.street,
    apiName: ApiName.generator,
    method: HTTPMethod.GET,
    url: buildApiUrl(mockDefinitions[1].url),
  },
  {
    endpointName: EndpointName.zipCode,
    apiName: ApiName.generator,
    method: HTTPMethod.GET,
    url: buildApiUrl(mockDefinitions[2].url),
  },
  {
    endpointName: EndpointName.city,
    apiName: ApiName.generator,
    method: HTTPMethod.GET,
    url: buildApiUrl(mockDefinitions[3].url),
  },
];

export type AxiosApiDefinition =
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.number;
      requestData: {};
      requestQueryParams: {};
      responseData: { number: number };
      requestHeaders: {};
    }
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.city;
      requestData: {};
      requestQueryParams: {};
      responseData: { city: string };
      requestHeaders: {};
    }
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.street;
      requestData: {};
      requestQueryParams: {};
      responseData: { street: string };
      requestHeaders: {};
    }
  | {
      apiName: ApiName.generator;
      endpointName: EndpointName.zipCode;
      requestData: {};
      requestQueryParams: {};
      responseData: { zipCode: string };
      requestHeaders: {};
    };
