/* eslint-disable no-console */
import { compose, storytellerHelper } from "@micro-package/storyteller";
import { createValueObject, forgeValueObject } from "@micro-package/container/value-object";
import { axiosPlugin } from "@micro-package/axios";
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

export const testFramework = compose(
  createValueObject(),
  storytellerPlugin<StepName>({}),
  axiosPlugin<{
    endpointName: EndpointName.googleMainPage;
    apiName: ApiName.google;
    requestData: { requestDataField1: string };
    requestQueryParams: {};
    responseData: { responseDataField1: string };
    requestHeaders: {};
  }>({
    apiDefinitions: [
      {
        endpointName: EndpointName.googleMainPage,
        apiName: ApiName.google,
        method: HTTPMethod.GET,
        url: "http://google.com",
      },
    ],
  }),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
