/* eslint-disable no-console */
import type { RequestHandler } from "express-serve-static-core";
import { StatusCodes } from "http-status-codes";
import { MockEndpointName } from "../../definitions/mock-definition";
import { externalApi } from "../../external-api";
import { testFramework } from "../../framework";
import { arrangeGoogleEndpoint, arrangeGoogleEndpointFactory } from "./arrange-google-endpoint";
import { expect } from "@jest/globals";
import { StorytellerHookName } from "@micro-package/storyteller/plugins/storyteller/types";
describe("arrange google endpoint", () => {
  afterEach(async () => {
    await testFramework.runHooks({ name: StorytellerHookName.storytellerFinished });
  });
  it("mock express with one handler", async () => {
    const step = arrangeGoogleEndpoint();
    let expressMockPayload = null;
    const valueObject = {
      expressMock: jest.fn((payload) => {
        expressMockPayload = payload;
      }),
    };

    await step.handler(valueObject as any);

    expect(valueObject.expressMock).toBeCalledTimes(1);
    expect(expressMockPayload).toStrictEqual({
      endpointName: MockEndpointName.googleMainPage,
      handlers: [[expect.any(Function)]],
    });
  });

  it("axios called during request execution", async () => {
    const axiosResponse = { data: "faked axios data", status: StatusCodes.GONE };
    const fakeAxios = jest.fn(() => axiosResponse);
    const step = arrangeGoogleEndpointFactory({ axios: fakeAxios as any })();
    let expressMockPayload: { handlers: RequestHandler[][] } = null as any;
    const valueObject = {
      expressMock: jest.fn((payload) => {
        expressMockPayload = payload;
      }),
    };

    await step.handler(valueObject as any);
    const expressMockRequest = { params: "mocked query params", query: "mocked query data" };
    const send = jest.fn(() => {});
    const status = jest.fn(() => ({ send }));
    await expressMockPayload.handlers[0][0](expressMockRequest as any, { status } as any, () => {});

    expect(fakeAxios).toBeCalledTimes(1);
    expect(fakeAxios).toBeCalledWith({
      url: externalApi.url,
      params: expressMockRequest.params,
      validateStatus: expect.any(Function),
    });
    expect(status).toBeCalledTimes(1);
    expect(status).toBeCalledWith(axiosResponse.status);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith(axiosResponse.data);
  });
});
