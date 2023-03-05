/* eslint-disable no-console */
import { StatusCodes } from "http-status-codes";
import { ApiEndpointName } from "../../definitions/api-definition";
import { testFramework } from "../../framework";
import { actGoogleEndpoint } from "./act-google-endpoint";
import { expect } from "@jest/globals";
import { StorytellerHookName } from "@micro-package/storyteller";
afterEach(async () => {
  await testFramework.runHooks({ name: StorytellerHookName.storytellerFinished });
});

describe("act google endpoint", () => {
  it("mock express with one handler", async () => {
    const stepPayload = {
      requestDataField1: "some fancy sentence",
    };
    const step = actGoogleEndpoint(stepPayload);
    let axiosRequestPayload = null;
    const valueObject = {
      axiosRequest: jest.fn((payload) => {
        axiosRequestPayload = payload;
        return { response: { status: StatusCodes.OK } };
      }),
    };

    await step.handler(valueObject as any);

    expect(valueObject.axiosRequest).toBeCalledTimes(1);
    expect(axiosRequestPayload).toStrictEqual({
      endpointName: ApiEndpointName.googleMainPage,
      config: expect.any(Function),
    });
  });
});
