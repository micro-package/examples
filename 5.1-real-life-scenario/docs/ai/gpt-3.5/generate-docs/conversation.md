I have applications with 3 main directories "docker", "tests" and "src".
In "src" directory there are application files. Those files are are used by application.
In "tests" directory there are tests files. Files with extension ".spec.ts" are used by jest to execute tests.
Files with ".ts" extension without ".spec.ts" contains shared parts that are used in ".spec.ts" file.

Tests are executed when application is running with environment variable APP_ENV equal "test".

It sounds like you have a basic structure for a Node.js project with a few directories that serve different purposes. Here's a breakdown of each directory and its contents:

"docker" directory: This directory likely contains configuration files related to Docker, such as Dockerfile and docker-compose.yml, which are used to define the application's containerized environment.

"tests" directory: This directory contains the test files for your application. The ".spec.ts" files contain the actual tests, while the ".ts" files without the ".spec.ts" extension contain shared parts that are used by the test files. It's common to use a testing framework like Jest in a Node.js project.

"src" directory: This directory contains the application files themselves. These files are what actually make up the application and are used to execute its functionality.

When you run your application with the environment variable "APP_ENV" set to "test", it's likely that some parts of your code will execute differently than when it's running in a production environment. This could include things like different database configurations or even different logic paths within your application's code.

Overall, this is a common structure for a Node.js project that separates out the application code from its tests and any configuration files needed for containerization.




Lukasz Klejszta
Tests is using @micro-package/storyteller framework. Here is implementation of this framework.
"hook.ts"
`
import type { Status, ValueObject } from "./value-object";

export interface HookHandler<TPayload, TResult = Promise<void>> {
  (valueObject: ValueObject<Status.forged, any, any>): (payload: TPayload) => TResult;
}

export interface HookDefinition<THookName extends string, TPayload> {
  name: THookName;
  payload: TPayload;
}

export type Hook<THookDefinition extends HookDefinition<string, any>> = {
  name: THookDefinition["name"];
  handler: HookHandler<THookDefinition["payload"]>;
};

export enum PrimaryHookName {
  beforeHook = "beforeHook",
  afterHook = "afterHook",
}

export type PrimaryHookDefinition<THookDefinition extends HookDefinition<string, any>> =
  | HookDefinition<PrimaryHookName.beforeHook, THookDefinition>
  | HookDefinition<PrimaryHookName.afterHook, THookDefinition>;
`
"plugin.ts"
`
import type { UnionToIntersection } from "../common/types";
import type { Hook, HookDefinition } from "./hook";
import type { Status } from "./value-object";
import type { ValueObject } from "./value-object";

export type PluginAction<TActionName extends string, TPayload extends any, TResult extends any> = {
  [key in TActionName]: (payload: TPayload) => TResult;
};

export type PluginName = string; //`${string}@${number}.${number}.${number}`;

export interface Plugin<
  TPluginName extends PluginName,
  TState extends any,
  TAction extends PluginAction<string, any, any>,
  THookDefinition extends HookDefinition<string, any>,
> {
  requiredPlugins?: string[];
  state: TState;
  name: TPluginName;
  actions: UnionToIntersection<{
    [key in keyof TAction]: (valueObject: ValueObject<Status.forged, any, any>) => TAction[key];
  }>;
  hooks: (THookDefinition extends infer UHookDefinition extends HookDefinition<string, any>
    ? Hook<UHookDefinition>
    : never)[];
}

export type CreatePlugin = <
  TPluginName extends PluginName,
  TAction extends PluginAction<string, any, any>,
  THookDefinition extends HookDefinition<string, any>,
  TPlugin extends Plugin<TPluginName, any, TAction, THookDefinition>,
>(
  plugin: TPlugin,
) => <
  TPrevTPluginName extends PluginName,
  TPrevAction extends PluginAction<string, any, any>,
  TPrevHookDefinition extends HookDefinition<string, any>,
  TPrevPlugin extends Plugin<TPrevTPluginName, any, TPrevAction, TPrevHookDefinition>,
>(
  valueObject: ValueObject<Status.created, TPrevHookDefinition, TPrevPlugin>,
) => ValueObject<Status.created, THookDefinition | TPrevHookDefinition, TPrevPlugin | TPlugin>;

export const createPlugin: CreatePlugin = (plugin) => (valueObject) => ({
  actions: null,
  getPlugin: valueObject.getPlugin,
  plugins: [...valueObject.plugins, plugin],
  runHooks: valueObject.runHooks,
});

`
"valueObject.ts"
`

import { errorValueObject } from "../common/error";
import type { UnionToIntersection } from "../common/types";
import type { Plugin, PluginAction, PluginName } from "./plugin"; //! Figure out why vs-code sees this as unused
import type { HookDefinition, PrimaryHookDefinition } from "./hook";
import { PrimaryHookName as PrimaryHookName } from "./hook";
import { cloneDeep } from "lodash";
import { applyProxies } from "../common/proxy/common";
import { errorDecoratorProxyHandler } from "../common/proxy/error-decorator";
import { loggerProxyHandler } from "../common/proxy/logger";
import { LoggingLevel } from "../common/enum";
import { winstonLogger } from "../common/logger";

export enum Status {
  created = "created",
  forged = "forged",
}

export interface ValueObject<
  TStatus extends Status,
  THookDefinition extends HookDefinition<string, any>,
  TPlugin extends Plugin<PluginName, any, any, THookDefinition>,
> {
  plugins: TPlugin[];
  actions: TStatus extends Status.created
    ? null
    : {
        [key in keyof UnionToIntersection<TPlugin["actions"]>]: ReturnType<
          //! I don't know why this ternary must exists. This seemed to work with vscode however typescript was failing when building declaration files (with the same typescript version on both compilers). This `(...args: any) => any ? UPluginAction : never` instead of `UPluginAction` looks like needs to be here but I don't know why, I figured this solution out looking at typescript errors.
          UnionToIntersection<TPlugin["actions"]>[key] extends infer UPluginAction extends (...args: any) => any
            ? UPluginAction
            : never
        >;
      };
  getPlugin: TStatus extends Status.created
    ? (valueObject: ValueObject<Status.forged, THookDefinition, TPlugin>) => GetPlugin<TPlugin>
    : GetPlugin<TPlugin>;
  runHooks: TStatus extends Status.created
    ? (
        valueObject: ValueObject<Status.forged, THookDefinition, Plugin<PluginName, any, any, THookDefinition>>,
      ) => RunHooks<THookDefinition>
    : RunHooks<THookDefinition>;
}

export interface RunHooks<THookDefinition extends HookDefinition<string, any>> {
  (
    payload: THookDefinition extends infer UHookDefinition extends THookDefinition
      ? keyof UHookDefinition["payload"] extends never
        ? Omit<UHookDefinition, "payload">
        : UHookDefinition
      : never,
  ): Promise<void>;
}

export type GetPlugin<TPlugin extends Plugin<PluginName, string, any, any>> = <TPluginName extends TPlugin["name"]>(
  pluginName: TPluginName,
) => Extract<TPlugin, { name: TPluginName }> extends infer UPlugin extends Plugin<any, any, any, any> ? UPlugin : never;

export const createValueObject = (): ValueObject<
  Status.created,
  PrimaryHookDefinition<HookDefinition<string, any>>,
  never
> => ({
  actions: null,
  getPlugin: (valueObject) => (name) => {
    //@ts-ignore
    const plugin = valueObject.plugins.find((ext) => ext.name === name);
    if (plugin === undefined) {
      throw errorValueObject("missing plugin", { name });
    }
    return plugin;
  },
  plugins: [],
  runHooks:
    (valueObject) =>
    async ({ name, payload }) => {
      for await (const plugin of valueObject.plugins) {
        for await (const hook of plugin.hooks) {
          if (hook.name === PrimaryHookName.beforeHook) {
            await hook.handler(valueObject)({ payload, name });
          }
        }
      }
      for await (const plugin of valueObject.plugins) {
        for await (const hook of plugin.hooks) {
          if (hook.name === name) {
            await hook.handler(valueObject)(payload);
          }
        }
      }
      for await (const plugin of valueObject.plugins) {
        for await (const hook of plugin.hooks) {
          if (hook.name === PrimaryHookName.afterHook) {
            await hook.handler(valueObject)({ payload, name });
          }
        }
      }
    },
});

export const forgeValueObject = (config: { debug: boolean }) => {
  winstonLogger.level = config.debug === true ? LoggingLevel.debug : LoggingLevel.plugin;
  return <
    TPluginName extends PluginName,
    TAction extends PluginAction<string, any, any>,
    THookDefinition extends HookDefinition<string, any>,
    TPlugin extends Plugin<TPluginName, any, TAction, THookDefinition>,
  >(
    prevValueObject: ValueObject<Status.created, THookDefinition, TPlugin>,
  ): ValueObject<Status.forged, THookDefinition, TPlugin> => {
    const nextValueObject = {
      actions: {} as any,
      plugins: [],
      getPlugin: undefined as any,
      runHooks: undefined as any,
    } as ValueObject<Status.forged, THookDefinition, TPlugin>;
    nextValueObject.runHooks = prevValueObject.runHooks(nextValueObject);
    nextValueObject.getPlugin = prevValueObject.getPlugin(nextValueObject);
    for (const [index, plugin] of prevValueObject.plugins.entries()) {
      const pluginName = plugin.name.split("@")[0];
      if (plugin.requiredPlugins !== undefined) {
        const missingPlugins = plugin.requiredPlugins.filter(
          (requiredPlugin) => prevValueObject.plugins.find(({ name }) => name === requiredPlugin) === undefined,
        );
        if (missingPlugins.length > 0) {
          throw errorValueObject("missing plugin", { plugin, missingPlugins });
        }
      }
      if (plugin.actions instanceof Object) {
        const wrongActionNames = Object.keys(plugin.actions).filter((actionName) => !actionName.startsWith(pluginName));
        if (wrongActionNames.length > 0) {
          throw errorValueObject("action name must starts with plugin name", { wrongActionNames, pluginName });
        }
      }
      nextValueObject.plugins[index] = cloneDeep({
        state: plugin.state,
        name: plugin.name,
        hooks: plugin.hooks,
        actions: plugin.actions,
      } as TPlugin);
      for (const [actionName, action] of Object.entries(plugin.actions as PluginAction<string, any, any>)) {
        Object.assign(
          nextValueObject.actions,
          applyProxies({ [actionName]: action(nextValueObject) }, [
            errorDecoratorProxyHandler({ dependencyName: `plugin-${pluginName}` }),
            loggerProxyHandler({
              dependencyName: `plugin-${pluginName}`,
              loggerLevel: LoggingLevel.debug,
            }),
          ]),
        );
      }
    }
    Object.assign(
      nextValueObject,
      applyProxies({ runHooks: nextValueObject.runHooks, getPlugin: nextValueObject.getPlugin }, [
        errorDecoratorProxyHandler({ dependencyName: "valueObject" }),
        loggerProxyHandler({
          dependencyName: "valueObject",
          loggerLevel: LoggingLevel.debug,
        }),
      ]),
    );
    return nextValueObject;
  };
};

`
It looks like you're using the @micro-package/storyteller framework to write tests for your Node.js application. This framework provides a way to create value objects that represent the state of your application and to define hooks and plugins that can modify that state.

The hook.ts file defines the interfaces and types for the hooks used in the framework. A hook is a function that takes a value object and returns another function that takes a payload as an argument. The payload is an object containing the data needed to execute the hook. The HookDefinition interface defines the shape of a hook's payload, while the HookHandler interface defines the shape of the function that will be executed when the hook is called.

The plugin.ts file defines the interfaces and types for the plugins used in the framework. A plugin is an object that contains state, actions, and hooks. The PluginAction type defines the shape of a plugin action, which is a function that takes a payload as an argument and returns a result. The Plugin interface combines the state, actions, and hooks of a plugin into a single object. The CreatePlugin type defines a function that takes a plugin object and returns a function that takes a value object as an argument and returns a new value object that includes the plugin. Finally, the createPlugin function implements the CreatePlugin type.

The valueObject.ts file defines the ValueObject interface, which represents the state of the application. A value object contains plugins, actions, and functions for running hooks. The RunHooks type defines the shape of the function that runs hooks, while the GetPlugin type defines the shape of the function that retrieves a plugin from a value object. The createValueObject function creates a new value object, while the forgeValueObject function modifies an existing value object by adding plugins and actions to it.

Overall, the @micro-package/storyteller framework provides a structured way to write tests for Node.js applications by defining value objects, hooks, and plugins. By breaking the application down into these components, it becomes easier to test and modify its behavior.




Lukasz Klejszta
axiosPlugin - "index.ts"
`
import axios from "axios";
import { pick } from "lodash";
import { buildEndpointDescription } from "../../common/endpoint-descriptor";
import { errorPlugin } from "../../common/error";
import { logger } from "../../common/logger";
import { createPlugin } from "../../container/plugin";
import { STORYTELLER_PLUG } from "../storyteller/name";
import type { StorytellerHookDefinition, StorytellerValueObject } from "../storyteller/types";
import { AXIOS_PLUG } from "./name";
import type {
  AxiosPluginApiDefinition,
  AxiosActions,
  AxiosApiDefinition,
  AxiosHookDefinition,
  AxiosPlugin,
  AxiosPluginRequest,
  AxiosPluginResponse,
  AxiosValueObject,
} from "./types";
import { AxiosHookName } from "./types";

export const axiosPlugin = <
  TAxiosPluginRequest extends AxiosPluginRequest<AxiosPluginApiDefinition<string, string>>,
>(config: {
  apiDefinitions: (TAxiosPluginRequest extends infer UAxiosPluginRequest extends AxiosPluginRequest<
    AxiosPluginApiDefinition<string, string>
  >
    ? AxiosApiDefinition<UAxiosPluginRequest>
    : never)[];
}) => {
  const nonUniquePluginNames = config.apiDefinitions
    .map(({ endpointName }) => endpointName)
    .filter((e, i, a) => a.indexOf(e) !== i);
  if (nonUniquePluginNames.length > 0) {
    throw errorPlugin("api definitions endpoint name must be unique in each definition", nonUniquePluginNames);
  }
  return createPlugin<
    typeof AXIOS_PLUG,
    AxiosActions<
      TAxiosPluginRequest,
      TAxiosPluginRequest extends infer UAxiosPluginRequest extends AxiosPluginRequest<
        AxiosPluginApiDefinition<string, string>
      >
        ? AxiosApiDefinition<UAxiosPluginRequest>
        : never
    >,
    AxiosHookDefinition<TAxiosPluginRequest> | StorytellerHookDefinition,
    AxiosPlugin<TAxiosPluginRequest, AxiosApiDefinition<TAxiosPluginRequest>>
  >({
    name: AXIOS_PLUG,
    requiredPlugins: [STORYTELLER_PLUG],
    state: { axios: axios.create({ validateStatus: () => true }), responses: [] },
    actions: {
      axiosGetResponses:
        (valueObject: AxiosValueObject<TAxiosPluginRequest, AxiosApiDefinition<TAxiosPluginRequest>>) => (payload) =>
          valueObject
            .getPlugin(AXIOS_PLUG)
            .state.responses.filter((response) => response.endpointName === payload.endpointName)
            .map((response) => (payload.paths === undefined ? response : pick(response, payload.paths))) as any,
      axiosRequest:
        (
          valueObject: AxiosValueObject<TAxiosPluginRequest, AxiosApiDefinition<TAxiosPluginRequest>> &
            StorytellerValueObject<string>,
        ) =>
        async (payload) => {
          const apiDefinition = config.apiDefinitions.find(({ endpointName }) => endpointName === payload.endpointName);
          if (apiDefinition === undefined) {
            throw errorPlugin("missing api definition", {
              received: config.apiDefinitions.map(({ endpointName }) => endpointName),
              expected: payload.endpointName,
            });
          }
          await valueObject.runHooks({
            name: AxiosHookName.axiosRequestStarted,
            payload: { apiDefinition },
          });
          const axiosConfig = await payload.config(apiDefinition as any);
          await valueObject.runHooks({
            name: AxiosHookName.axiosRequestConfigured,
            payload: { apiDefinition, config: axiosConfig },
          });
          try {
            const response = await valueObject.getPlugin(AXIOS_PLUG).state.axios({ ...apiDefinition, ...axiosConfig });
            //! this await for 10ms ensure that each axios request will not execute at the same time (so if some data is saved in database, createdAt will not be the same)
            await new Promise((resolve) => setTimeout(resolve, 10));
            const pluginResponse: AxiosPluginResponse<TAxiosPluginRequest> = { response, ...apiDefinition };
            valueObject.getPlugin(AXIOS_PLUG).state.responses.push({ response, ...apiDefinition });
            await valueObject.runHooks({ name: AxiosHookName.axiosRequestFinished, payload: pluginResponse });
            return pluginResponse as any;
          } catch (error) {
            await valueObject.runHooks({
              name: AxiosHookName.axiosRequestErrored,
              payload: { error, apiDefinition },
            });
            throw error;
          }
        },
    },
    hooks: [
      {
        name: AxiosHookName.axiosRequestStarted,
        handler: () => async (payload) => {
          logger.ascent(AXIOS_PLUG, `request started ${buildEndpointDescription(payload.apiDefinition)}`);
        },
      },
      {
        name: AxiosHookName.axiosRequestFinished,
        handler: () => async (payload) => {
          logger.descent(
            AXIOS_PLUG,
            `request finished ${payload.response.status} ${buildEndpointDescription(payload)}`,
          );
        },
      },
      {
        name: AxiosHookName.axiosRequestErrored,
        handler: () => async (payload) => {
          logger.descent(
            AXIOS_PLUG,
            `request errored ${payload.error.message} ${buildEndpointDescription(payload.apiDefinition)}`,
          );
          throw errorPlugin("request errored", payload);
        },
      },
    ],
  });
};

`
axiosPlugin "types.ts"
`
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type HTTPMethod from "http-method-enum";
import type { DotNotation } from "../../common/dot-notation";
import type { HookDefinition } from "../../container/hook";
import type { Plugin, PluginAction } from "../../container/plugin";
import type { Status, ValueObject } from "../../container/value-object";
import type { StorytellerHookDefinition } from "../storyteller/types";
import type { AXIOS_PLUG } from "./name";

export interface AxiosPluginApiDefinition<TApiName extends string, TEndpointName extends string> {
  apiName: TApiName;
  endpointName: TEndpointName;
}

export type AxiosPluginRequest<TApiDefinition extends AxiosPluginApiDefinition<string, string>> = Pick<
  TApiDefinition,
  keyof AxiosPluginApiDefinition<string, string>
> & {
  requestData: any;
  requestHeaders: any;
  requestQueryParams: any;
  responseData: any;
};

export type AxiosApiDefinition<TApiDefinition extends AxiosPluginApiDefinition<string, string>> = Pick<
  TApiDefinition,
  keyof AxiosPluginApiDefinition<string, string>
> & {
  method: HTTPMethod;
  url: string;
};

export type AxiosPluginResponse<
  TAxiosPluginRequest extends AxiosPluginRequest<AxiosPluginApiDefinition<string, string>>,
> = AxiosApiDefinition<TAxiosPluginRequest> & {
  response: AxiosResponse<
    TAxiosPluginRequest["responseData"],
    TAxiosPluginRequest["requestData"] & { headers: TAxiosPluginRequest["requestHeaders"] }
  >;
};

export enum AxiosHookName {
  axiosRequestStarted = "axiosRequestStarted",
  axiosRequestConfigured = "axiosRequestConfigured",
  axiosRequestFinished = "axiosRequestFinished",
  axiosRequestErrored = "axiosRequestErrored",
}

export type AxiosHookDefinition<
  TAxiosPluginRequest extends AxiosPluginRequest<AxiosPluginApiDefinition<string, string>>,
> =
  | HookDefinition<
      AxiosHookName.axiosRequestStarted,
      { apiDefinition: AxiosApiDefinition<AxiosPluginApiDefinition<string, string>> }
    >
  | HookDefinition<
      AxiosHookName.axiosRequestConfigured,
      { config: AxiosRequestConfig<any>; apiDefinition: AxiosApiDefinition<AxiosPluginApiDefinition<string, string>> }
    >
  | HookDefinition<AxiosHookName.axiosRequestFinished, AxiosPluginResponse<TAxiosPluginRequest>>
  | HookDefinition<
      AxiosHookName.axiosRequestErrored,
      { error: Error; apiDefinition: AxiosApiDefinition<AxiosPluginApiDefinition<string, string>> }
    >;

export interface AxiosState<TAxiosPluginRequest extends AxiosPluginRequest<AxiosPluginApiDefinition<string, string>>> {
  axios: AxiosInstance;
  responses: AxiosPluginResponse<TAxiosPluginRequest>[];
}

export interface AxiosActions<
  TAxiosPluginRequest extends AxiosPluginRequest<AxiosPluginApiDefinition<string, string>>,
  TAxiosApiDefinition extends AxiosApiDefinition<TAxiosPluginRequest>,
> extends PluginAction<any, any, any> {
  axiosRequest: <TAxiosEndpointName extends TAxiosPluginRequest["endpointName"]>(payload: {
    endpointName: TAxiosEndpointName;
    config: (payload: TAxiosApiDefinition) => Promise<
      (keyof (TAxiosPluginRequest & { endpointName: TAxiosEndpointName })["requestData"] extends never
        ? AxiosRequestConfig<(TAxiosPluginRequest & { endpointName: TAxiosEndpointName })["requestData"]>
        : Required<
            Pick<
              AxiosRequestConfig<(TAxiosPluginRequest & { endpointName: TAxiosEndpointName })["requestData"]>,
              "data"
            >
          >) &
        (keyof (TAxiosPluginRequest & { endpointName: TAxiosEndpointName })["requestHeaders"] extends never
          ? {}
          : {
              headers: (TAxiosPluginRequest & { endpointName: TAxiosEndpointName })["requestHeaders"];
            }) &
        (keyof (TAxiosPluginRequest & { endpointName: TAxiosEndpointName })["requestQueryParams"] extends never
          ? {}
          : {
              params: (TAxiosPluginRequest & { endpointName: TAxiosEndpointName })["requestQueryParams"];
            })
    >;
  }) => Promise<AxiosPluginResponse<TAxiosPluginRequest & { endpointName: TAxiosEndpointName }>>;
  axiosGetResponses: <
    TAxiosEndpointName extends TAxiosPluginRequest["endpointName"],
    TPath extends DotNotation<AxiosPluginResponse<TAxiosPluginRequest & { endpointName: TAxiosEndpointName }>>,
  >(payload: {
    endpointName: TAxiosEndpointName;
    paths?: TPath[];
  }) => AxiosPluginResponse<TAxiosPluginRequest & { endpointName: TAxiosEndpointName }>[];
}

export interface AxiosPlugin<
  TAxiosPluginRequest extends AxiosPluginRequest<AxiosPluginApiDefinition<string, string>>,
  TAxiosApiDefinition extends AxiosApiDefinition<TAxiosPluginRequest>,
> extends Plugin<
    typeof AXIOS_PLUG,
    AxiosState<TAxiosPluginRequest>,
    AxiosActions<TAxiosPluginRequest, TAxiosApiDefinition>,
    AxiosHookDefinition<TAxiosPluginRequest> | StorytellerHookDefinition
  > {}
export interface AxiosValueObject<
  TAxiosPluginRequest extends AxiosPluginRequest<AxiosPluginApiDefinition<string, string>>,
  TAxiosApiDefinition extends AxiosApiDefinition<TAxiosPluginRequest>,
> extends ValueObject<
    Status.forged,
    AxiosHookDefinition<TAxiosPluginRequest> | StorytellerHookDefinition,
    AxiosPlugin<TAxiosPluginRequest, TAxiosApiDefinition>
  > {}

`

axiosPlugin "name.ts"
`
export const AXIOS_PLUG = "axios@1.0.0";
`
This is a TypeScript module that defines an Axios plugin used in a larger software project.

The axiosPlugin function exports a factory function that returns an instance of the Axios plugin. The returned plugin is an object that can be used to make HTTP requests using the Axios library.

The plugin has two generic types: TAxiosPluginRequest and TAxiosApiDefinition. TAxiosPluginRequest represents the shape of the data that is sent with the HTTP request, while TAxiosApiDefinition represents the shape of the API endpoint that the request is being sent to.

The axiosPlugin function takes an object with a single property apiDefinitions, which is an array of AxiosApiDefinition objects. These objects specify the configuration for each API endpoint that the plugin will be able to call. If any of the endpoint names are duplicated, the function will throw an error.

The returned plugin object has a state property, which contains an Axios instance and an array of responses received from previous HTTP requests. The actions property contains two functions: axiosRequest is used to make an HTTP request using Axios, and axiosGetResponses retrieves responses from previous HTTP requests made with the plugin.

The plugin also defines four hooks: axiosRequestStarted, axiosRequestConfigured, axiosRequestFinished, and axiosRequestErrored. These hooks are used to log information about each HTTP request, such as when it starts and when it finishes.

Finally, the plugin defines two types: AxiosHookDefinition and AxiosPlugin. AxiosHookDefinition specifies the shape of the data that is passed to each hook function, while AxiosPlugin represents the entire plugin object.

The file name.ts simply exports a string that is used as the name of the plugin.




Lukasz Klejszta
expressPlugin "index.ts"
`
import express, { Router } from "express";
import type { ErrorRequestHandler, RequestHandler } from "express-serve-static-core";
import { createPlugin } from "../../container/plugin";
import { logger } from "../../common/logger";
import type HTTPMethod from "http-method-enum";
import { errorPlugin } from "../../common/error";
import { pick } from "lodash";
import { EXPRESS_PLUG } from "./name";
import { StatusCodes } from "http-status-codes";
import { inspect } from "util";
import { buildEndpointDescription } from "../../common/endpoint-descriptor";
import { STORYTELLER_PLUG } from "../storyteller/name";
import type { StorytellerHookDefinition } from "../storyteller/types";
import { StorytellerHookName } from "../storyteller/types";
import type {
  ExpressPluginApiDefinition,
  ExpressActions,
  ExpressHookDefinition,
  ExpressMock,
  ExpressMockDefinitions,
  ExpressPlugin,
  ExpressValueObject,
} from "./types";

const notFoundHandlerMiddleware: RequestHandler = async (req, res) => {
  logger.plugin(
    EXPRESS_PLUG,
    `Not Found ${req.method} ${req.baseUrl} ${inspect({
      query: req.query,
      body: req.body,
      params: req.params,
      headers: req.headers,
    })}`,
  );
  res.status(StatusCodes.NOT_FOUND).send(`Page ${req.baseUrl} not found`);
};
const errorHandlerMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const message = `❗ Mock server call errored ${req.method} ${req.baseUrl} > ${inspect(error, false, Infinity)}`;
  logger.plugin(EXPRESS_PLUG, message);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(message);
};

export const expressPlugin = <TExpressMock extends ExpressMock<ExpressPluginApiDefinition<string, string>>>(config: {
  port: number;
  mockDefinitions: (TExpressMock extends infer UExpressMock extends ExpressMock<
    ExpressPluginApiDefinition<string, string>
  >
    ? ExpressMockDefinitions<UExpressMock>
    : never)[];
}) => {
  const nonUniquePluginNames = config.mockDefinitions
    .map(({ endpointName }) => endpointName)
    .filter((e, i, a) => a.indexOf(e) !== i);
  if (nonUniquePluginNames.length > 0) {
    throw errorPlugin("mock definitions endpoint name must be unique in each definition", nonUniquePluginNames);
  }
  return createPlugin<
    typeof EXPRESS_PLUG,
    ExpressActions<TExpressMock>,
    ExpressHookDefinition | StorytellerHookDefinition,
    ExpressPlugin<TExpressMock>
  >({
    name: EXPRESS_PLUG,
    requiredPlugins: [STORYTELLER_PLUG],
    actions: {
      expressGetMock: (valueObject: ExpressValueObject<TExpressMock>) => (payload) => {
        const mock = valueObject
          .getPlugin(EXPRESS_PLUG)
          .state.mockDefinitions.find(({ endpointName }) => endpointName === payload.endpointName);
        if (mock === undefined) {
          throw errorPlugin("missing mock");
        }
        return payload.paths === undefined ? mock : (pick(mock, payload.paths) as typeof mock);
      },
      expressGetExecutions: (valueObject: ExpressValueObject<TExpressMock>) => (payload) =>
        valueObject
          .getPlugin(EXPRESS_PLUG)
          .state.executions.filter(({ endpointName }) => endpointName === payload.endpointName)
          .map((execution) => (payload.paths === undefined ? execution : pick(execution, payload.paths))) as any,
      expressMock: (valueObject: ExpressValueObject<TExpressMock>) => async (payload) => {
        const mockDefinition =
          payload?.apiDefinition ||
          config.mockDefinitions.find(({ endpointName: mockName }) => mockName === payload.endpointName);
        if (mockDefinition === undefined) {
          throw errorPlugin("missing mock definition");
        }
        const mock = {
          ...mockDefinition,
          url: `${new URL(mockDefinition.url).origin}/${mockDefinition.apiName}${new URL(mockDefinition.url).pathname}`,
        };
        logger.plugin(
          EXPRESS_PLUG,
          `mock creation started - ${payload.handlers.length} executions ${buildEndpointDescription({
            ...mock,
            url: `http://localhost:${config.port}`,
          })}`,
        );
        let index = 0;
        valueObject
          .getPlugin(EXPRESS_PLUG)
          .state.globalState.router[mock.method.toLowerCase() as Lowercase<HTTPMethod>](
            new URL(mock.url).pathname,
            ...payload.handlers[index].slice(0, -1),
            async (req, res, next) => {
              logger.plugin(
                EXPRESS_PLUG,
                `execution started ${index + 1}/${payload.handlers.length} ${buildEndpointDescription(mock)}`,
              );
              if (index >= payload.handlers.length) {
                logger.error(EXPRESS_PLUG, "handlers usage exceeded");
                res
                  .status(StatusCodes.IM_A_TEAPOT)
                  .send({ message: "handlers usage exceeded", lastIndex: index, payload });
              } else {
                const handler = payload.handlers[index][payload.handlers[index].length - 1];
                await handler(req, res, next);
              }
              logger.plugin(
                EXPRESS_PLUG,
                `execution finished ${index + 1}/${payload.handlers.length} ${buildEndpointDescription(mock)}`,
              );
              valueObject.getPlugin(EXPRESS_PLUG).state.executions.push({ ...mock, response: res, request: req });
              index += 1;
            },
          );
        valueObject.getPlugin(EXPRESS_PLUG).state.mockDefinitions.push({
          handlers: payload.handlers,
          ...mock,
        });
        logger.plugin(
          EXPRESS_PLUG,
          `mocked creation finished - ${payload.handlers.length} executions ${buildEndpointDescription(mock)}`,
        );
      },
    },
    state: {
      mockDefinitions: [],
      executions: [],
      globalState: {
        express: express(),
        server: null as any,
        router: Router(),
      },
    },
    hooks: [
      {
        name: StorytellerHookName.arrangeStarted,
        handler:
          (valueObject: ExpressValueObject<ExpressMock<ExpressPluginApiDefinition<string, string>>>) => async () => {
            valueObject.getPlugin(EXPRESS_PLUG).state.globalState.router = Router();
            logger.plugin(EXPRESS_PLUG, "routes cleared");
          },
      },
      {
        name: StorytellerHookName.storytellerCreated,
        handler: (valueObject: ExpressValueObject<TExpressMock>) => async () => {
          valueObject.getPlugin(EXPRESS_PLUG).state.globalState.express.use(function (req, res, next) {
            valueObject.getPlugin(EXPRESS_PLUG).state.globalState.router(req, res, next);
          });
          valueObject.getPlugin(EXPRESS_PLUG).state.globalState.server = valueObject
            .getPlugin(EXPRESS_PLUG)
            .state.globalState.express.listen(config.port);
          logger.plugin(EXPRESS_PLUG, `plugin listening on port: ${config.port}`);
        },
      },
      {
        name: StorytellerHookName.arrangeFinished,
        handler: (valueObject: ExpressValueObject<TExpressMock>) => async () => {
          valueObject.getPlugin(EXPRESS_PLUG).state.globalState.router.use(notFoundHandlerMiddleware);
          logger.plugin(EXPRESS_PLUG, "global middleware added: not found handler");
          valueObject.getPlugin(EXPRESS_PLUG).state.globalState.router.use(errorHandlerMiddleware);
          logger.plugin(EXPRESS_PLUG, "global middleware added: error handler");
        },
      },
      {
        name: StorytellerHookName.storytellerFinished,
        handler: (valueObject: ExpressValueObject<TExpressMock>) => async () => {
          valueObject.getPlugin(EXPRESS_PLUG).state.globalState.server.close();
          logger.plugin(EXPRESS_PLUG, "server closed");
        },
      },
    ],
  });
};

`
expressPlugin "name.ts"
`
export const EXPRESS_PLUG = "express@1.0.0";

`
expressPlugin "types.ts"
`
import type { Request, Router } from "express";
import type { Express, NextFunction, ParamsDictionary, Response } from "express-serve-static-core";
import type { Server } from "http";
import type { ParsedQs } from "qs";
import type { Plugin, PluginAction } from "../../container/plugin";
import type { Status, ValueObject } from "../../container/value-object";
import type HTTPMethod from "http-method-enum";
import type { DotNotation } from "../../common/dot-notation";
import type { EXPRESS_PLUG } from "./name";
import type { StorytellerHookDefinition } from "../storyteller/types";

export interface ExpressPluginApiDefinition<TApiName extends string, TEndpointName extends string> {
  apiName: TApiName;
  endpointName: TEndpointName;
}
export type ExpressMockDefinitions<TApiDefinition extends ExpressPluginApiDefinition<string, string>> = Pick<
  TApiDefinition,
  keyof ExpressPluginApiDefinition<string, string>
> & {
  method: HTTPMethod;
  url: string;
};

export type ExpressMock<TApiDefinition extends ExpressPluginApiDefinition<string, string>> = TApiDefinition & {
  requestParameter: ParamsDictionary;
  responseBody: any;
  requestBody: any;
  requestQuery: ParsedQs;
};

export type ExpressMockExecution<TExpressMock extends ExpressMock<ExpressPluginApiDefinition<string, string>>> =
  ExpressMockDefinitions<TExpressMock> & {
    response: Response<TExpressMock["responseBody"]>;
    request: Request<
      TExpressMock["requestParameter"],
      TExpressMock["responseBody"],
      TExpressMock["requestBody"],
      TExpressMock["requestQuery"]
    >;
  };

export type ExpressMockPayload<TExpressMock extends ExpressMock<ExpressPluginApiDefinition<string, string>>> = {
  endpointName: TExpressMock["endpointName"];
  handlers: ((
    request: Request<
      TExpressMock["requestParameter"],
      TExpressMock["responseBody"],
      TExpressMock["requestBody"],
      TExpressMock["requestQuery"]
    >,
    response: Response<TExpressMock["responseBody"]>,
    next: NextFunction,
  ) => Promise<void> | void)[][];
};

export enum ExpressHookName {}
export type ExpressHookDefinition = never;
export interface ExpressState<TExpressMock extends ExpressMock<ExpressPluginApiDefinition<string, string>>> {
  mockDefinitions: (ExpressMockDefinitions<TExpressMock> & ExpressMockPayload<TExpressMock>)[];
  executions: ExpressMockExecution<TExpressMock>[];
  globalState: {
    express: Express;
    server: Server;
    router: Router;
  };
}

export interface ExpressActions<TExpressMock extends ExpressMock<ExpressPluginApiDefinition<string, string>>>
  extends PluginAction<string, any, any> {
  expressMock: (
    payload: ExpressMockPayload<TExpressMock> & {
      apiDefinition?: ExpressMockDefinitions<ExpressPluginApiDefinition<string, string>>;
    },
  ) => Promise<void>;
  expressGetMock: <
    TPayloadEndpointName extends TExpressMock["endpointName"],
    TPath extends
      | DotNotation<
          ExpressMockPayload<TExpressMock> &
            ExpressMockDefinitions<TExpressMock> & { endpointName: TPayloadEndpointName }
        >
      | "handlers",
  >(payload: {
    endpointName: TPayloadEndpointName;
    paths?: TPath[];
  }) => ExpressMockPayload<TExpressMock> &
    ExpressMockDefinitions<TExpressMock> & { endpointName: TExpressMock["endpointName"] };
  expressGetExecutions: <
    TPayloadEndpointName extends TExpressMock["endpointName"],
    TPath extends DotNotation<ExpressMockExecution<TExpressMock> & { endpointName: TExpressMock["endpointName"] }>,
  >(payload: {
    endpointName: TPayloadEndpointName;
    paths?: TPath[];
  }) => ExpressMockExecution<TExpressMock>[];
}
export interface ExpressPlugin<TExpressMock extends ExpressMock<ExpressPluginApiDefinition<string, string>>>
  extends Plugin<
    typeof EXPRESS_PLUG,
    ExpressState<TExpressMock>,
    ExpressActions<TExpressMock>,
    ExpressHookDefinition | StorytellerHookDefinition
  > {}

export interface ExpressValueObject<TExpressMock extends ExpressMock<ExpressPluginApiDefinition<string, string>>>
  extends ValueObject<Status.forged, ExpressHookDefinition | StorytellerHookDefinition, ExpressPlugin<TExpressMock>> {}

`
This is TypeScript code for an Express plugin that can be used with the Storyteller test framework. The plugin allows you to create and mock API endpoints for an Express server. It exports several interfaces and types, including ExpressMock, ExpressMockPayload, ExpressActions, and ExpressPlugin.

The expressPlugin function is the main entry point of the plugin, which takes a configuration object containing a port number and an array of mockDefinitions. It returns a createPlugin function, which creates a new plugin instance with the name EXPRESS_PLUG and the provided actions, hooks, and initial state.

The plugin uses express and express-serve-static-core to create an Express server and define middleware functions for handling 404 and error cases. The expressMock action is used to mock an endpoint with the provided handlers array, which is an array of functions that handle incoming requests. The expressGetMock and expressGetExecutions actions are used to retrieve information about previously defined mocks and their executions.

The plugin also defines several hooks that can be used to perform actions at different points in the testing lifecycle. These hooks include StorytellerHookName.arrangeStarted, StorytellerHookName.storytellerCreated, StorytellerHookName.arrangeFinished, and StorytellerHookName.storytellerFinished.

Overall, this plugin provides a convenient way to create and mock API endpoints for testing Express servers with the Storyteller test framework.




Lukasz Klejszta
storytellerPlugin "index.ts"
`
import { cloneDeep } from "lodash";
import { errorPlugin } from "../../common/error";
import { logger } from "../../common/logger";
import { createPlugin } from "../../container/plugin";
import { STORYTELLER_PLUG } from "./name";
import type {
  StorytellerActions,
  StorytellerHelper,
  StorytellerHookDefinition,
  StorytellerPlugin,
  StorytellerValueObject,
  TestRunnerNameGetters,
} from "./types";
import { SectionName } from "./types";
import { StorytellerHookName, StorytellerStepStatus } from "./types";
import { pipelineUnary } from "ts-pipe-compose";
import { WebSocket } from "ws";
import { PrimaryHookName } from "../../container/hook";
import { secureJsonStringify } from "../../common/parser/secure-json";
import { v4 } from "uuid";
import { DateTime } from "luxon";

export const testRunnerNameGetters: TestRunnerNameGetters[] = [
  //@ts-ignore
  { name: "jest", getStoryName: () => expect?.getState()?.currentTestName },
  //@ts-ignore
  { name: "mocha", getStoryName: () => this?.test?.fullTitle() },
];

const initializeWebsocketConnection = (config: { url: string }) => {
  const websocket = new WebSocket(`${config.url}?userId=123&userType=storyteller`);
  websocket.on("error", (err) => logger.debug(STORYTELLER_PLUG, `weboskcet error: ${err.toString()}`));
  websocket.on("message", (data) => logger.debug(STORYTELLER_PLUG, `weboskcet message: ${data.toString()}`));
  websocket.on("close", (code, reason) =>
    logger.debug(STORYTELLER_PLUG, `weboskcet close: ${code} ${Buffer.from(reason).toString()}`),
  );
  const wsConnection = new Promise((resolve) =>
    websocket.once("open", () => {
      logger.plugin(STORYTELLER_PLUG, `Websocket connected: ${config.url}`);
      resolve(undefined);
    }),
  );
  return {
    getWebsocket: async () => {
      await wsConnection;
      return websocket;
    },
  };
};
const executionId = v4();
I'm sorry, I can't see any question in your message. Can you please provide more information on what you would like to know or learn?




Lukasz Klejszta
export const storytellerPlugin = <TStepName extends string>(config: {
  testRunnerGetTestName?: TestRunnerNameGetters;
  websocketUrl?: string;
}) =>
  createPlugin<
    typeof STORYTELLER_PLUG,
    StorytellerActions<TStepName>,
    StorytellerHookDefinition,
    StorytellerPlugin<TStepName>
  >({
    name: STORYTELLER_PLUG,
    state: {
      globalState: {
        storiesCreatedAmount: 0,
        storiesStartedAmount: 0,
        storiesFinishedAmount: 0,
        storiesErroredAmount: 0,
        storyName: "STORY_NAME_NOT_SET",
        ws: config.websocketUrl !== undefined ? initializeWebsocketConnection({ url: config.websocketUrl }) : undefined,
      },
      steps: [],
      defaultStates: [],
    },
    actions: {
      storytellerCreateStep: (valueObject: StorytellerValueObject<TStepName>) => (step) => {
        const stepReference = { ...step, status: StorytellerStepStatus.created };
        const stepHandler = async (prevStepPromise: Promise<any>) => {
          await prevStepPromise;
          valueObject.getPlugin(STORYTELLER_PLUG).state.steps.push(stepReference);
          await valueObject.runHooks({
            name: StorytellerHookName.stepCreated,
            payload: { step: stepReference as any },
          });
          stepReference.status = StorytellerStepStatus.started;
          await valueObject.runHooks({
            name: StorytellerHookName.stepStarted,
            payload: { step: stepReference as any },
          });
          try {
            await step.handler(valueObject.actions);
            stepReference.status = StorytellerStepStatus.finished;
            await valueObject.runHooks({
              name: StorytellerHookName.stepFinished,
              payload: { step: stepReference as any },
            });
          } catch (error) {
            stepReference.status = StorytellerStepStatus.errored;
            await valueObject.runHooks({
              name: StorytellerHookName.stepErrored,
              payload: { step: stepReference as any, error },
            });
            throw error;
          }
        };
        stepHandler.handler = step.handler;
        return stepHandler;
      },
      storytellerCreateStory: (valueObject: StorytellerValueObject<TStepName>) =>
        function (story) {
          valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesCreatedAmount += 1;
          return async () => {
            valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesStartedAmount += 1;
            const storyName = (
              config.testRunnerGetTestName === undefined
                ? testRunnerNameGetters
                : [config.testRunnerGetTestName, ...testRunnerNameGetters]
            )
              .map((payload) => {
                try {
                  const name = payload.getStoryName();
                  if (name === undefined) {
                    throw Error("no story name");
                  }
                  logger.plugin(STORYTELLER_PLUG, `Test name received from "${payload.name}" test runner`);
                  return name;
                } catch (error) {
                  return undefined;
                }
              })
              .find((testName) => testName !== undefined);
            if (storyName === undefined) {
              throw errorPlugin("story name couldn`t be received from test runner");
            }
            valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storyName = storyName;
            try {
              await valueObject.runHooks({ name: StorytellerHookName.storyStarted });
              try {
                await valueObject.runHooks({ name: StorytellerHookName.arrangeStarted });
                await story.arrange(valueObject.actions);
                await valueObject.runHooks({ name: StorytellerHookName.arrangeFinished });
              } catch (error) {
                await valueObject.runHooks({
                  name: StorytellerHookName.arrangeErrored,
                  payload: { error },
                });
                throw error;
              }
              try {
                await valueObject.runHooks({ name: StorytellerHookName.actStarted });
                await story.act(valueObject.actions);
                await valueObject.runHooks({ name: StorytellerHookName.actFinished });
              } catch (error) {
                await valueObject.runHooks({ name: StorytellerHookName.actErrored, payload: { error } });
                throw error;
              }
              try {
                await valueObject.runHooks({ name: StorytellerHookName.assertStarted });
                await story.assert(valueObject.actions);
                await valueObject.runHooks({ name: StorytellerHookName.assertFinished });
              } catch (error) {
                await valueObject.runHooks({ name: StorytellerHookName.assertErrored, payload: { error } });
                throw error;
              }
              await valueObject.runHooks({ name: StorytellerHookName.storyFinished });
              valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesFinishedAmount += 1;
            } catch (error) {
              valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesErroredAmount += 1;
              await valueObject.runHooks({ name: StorytellerHookName.storyErrored, payload: { error } });
              throw error;
            } finally {
              //? This setImmediate makes storyteller to run if condition after the next story is triggered or now if no story was left to trigger. This way condition is met only if last story is finished.
              setImmediate(async () => {
                if (
                  valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesStartedAmount ===
                  valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesErroredAmount +
                    valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesFinishedAmount
                ) {
                  await valueObject.runHooks({ name: StorytellerHookName.storytellerFinished });
                }
              });
            }
          };
        },
    },
    hooks: [
      {
        name: StorytellerHookName.stepErrored,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async (payload) => {
          logger.descent(
            STORYTELLER_PLUG,
            `step errored "${payload.step.name}" - ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status !== StorytellerStepStatus.created).length
            } created, ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status === StorytellerStepStatus.finished).length
            } finished, ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status === StorytellerStepStatus.errored).length
            } errored: ${payload.error.message}`,
          );
        },
      },
      {
        name: StorytellerHookName.stepFinished,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async (payload) => {
          logger.descent(
            STORYTELLER_PLUG,
            `step finished "${payload.step.name}" - ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status !== StorytellerStepStatus.created).length
            } created, ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status === StorytellerStepStatus.finished).length
            } finished, ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status === StorytellerStepStatus.errored).length
            } errored`,
          );
        },
      },
      {
        name: StorytellerHookName.stepStarted,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async (payload) => {
          logger.ascent(
            STORYTELLER_PLUG,
            `step started "${payload.step.name}" - ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status !== StorytellerStepStatus.created).length
            } started, ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status === StorytellerStepStatus.finished).length
            } finished, ${
              valueObject
                .getPlugin(STORYTELLER_PLUG)
                .state.steps.filter((step) => step.status === StorytellerStepStatus.errored).length
            } errored`,
          );
        },
      },
      {
        name: StorytellerHookName.assertStarted,
        handler: () => async () => {
          logger.ascent(STORYTELLER_PLUG, "section assert started");
        },
      },
      {
        name: StorytellerHookName.assertFinished,
        handler: () => async () => {
          logger.descent(STORYTELLER_PLUG, "section assert finished");
        },
      },
      {
        name: StorytellerHookName.assertErrored,
        handler: () => async (payload) => {
          logger.plugin(STORYTELLER_PLUG, `section assert errored: ${payload.error.message}`);
          logger.descent(STORYTELLER_PLUG, SectionName.assert);
        },
      },
      {
        name: StorytellerHookName.actStarted,
        handler: () => async () => {
          logger.ascent(STORYTELLER_PLUG, "section act started");
        },
      },
      {
        name: StorytellerHookName.actFinished,
        handler: () => async () => {
          logger.descent(STORYTELLER_PLUG, "section act finished");
        },
      },
      {
        name: StorytellerHookName.actErrored,
        handler: () => async (payload) => {
          logger.descent(STORYTELLER_PLUG, `section act errored: ${payload.error.message}`);
        },
      },
      {
        name: StorytellerHookName.arrangeStarted,
        handler: () => async () => {
          logger.ascent(STORYTELLER_PLUG, "section arrange started");
        },
      },
      {
        name: StorytellerHookName.arrangeFinished,
        handler: () => async () => {
          logger.descent(STORYTELLER_PLUG, "section arrange finished");
        },
      },
      {
        name: StorytellerHookName.arrangeErrored,
        handler: () => async (payload) => {
          logger.descent(STORYTELLER_PLUG, `section arrange errored: ${payload.error.message}`);
        },
      },
      {
        name: StorytellerHookName.storyFinished,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async () => {
          logger.descent(
            STORYTELLER_PLUG,
            `story finished \"${valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storyName}\" - ${
              valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesStartedAmount
            } finished, ${valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesCreatedAmount} created`,
          );
        },
      },
      {
        name: StorytellerHookName.storyStarted,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async (payload) => {
          const defaultStates = cloneDeep(valueObject.getPlugin(STORYTELLER_PLUG).state.defaultStates);
          valueObject.plugins = valueObject.plugins.map((plugin) => {
            const defaultState = valueObject
              .getPlugin(STORYTELLER_PLUG)
              .state.defaultStates.find(({ pluginName }) => pluginName === plugin.name);
            if (defaultState === undefined) {
              throw errorPlugin("missing plugin default state", {
                payload,
                plugin,
                defaultState,
              });
            }
            return { ...plugin, state: { ...defaultState.state, globalState: plugin.state.globalState } };
          });
          valueObject.getPlugin(STORYTELLER_PLUG).state.defaultStates = defaultStates;
          logger.ascent(
            STORYTELLER_PLUG,
            `story started \"${valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storyName}\" - ${
              valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesStartedAmount
            } started, ${valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesCreatedAmount} created`,
          );
        },
      },
      {
        name: StorytellerHookName.storyErrored,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async (payload) => {
          logger.descent(
            STORYTELLER_PLUG,
            `story errored \"${valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storyName}\" - ${
              valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesStartedAmount
            } errored, ${valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.storiesCreatedAmount} created: ${
              payload.error.message
            }`,
          );
        },
      },
      {
        name: StorytellerHookName.stepCreated,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async (payload) => {
          logger.plugin(
            STORYTELLER_PLUG,
            `Step appended "${payload.step.name}" - ${
              valueObject.getPlugin(STORYTELLER_PLUG).state.steps.length
            } index`,
          );
        },
      },
      {
        name: StorytellerHookName.storytellerCreated,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async () => {
          await valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.ws?.getWebsocket();
          valueObject.getPlugin(STORYTELLER_PLUG).state.defaultStates = valueObject.plugins.map((plugin) =>
            cloneDeep({ pluginName: plugin.name, state: plugin.state }),
          );
        },
      },
      {
        name: StorytellerHookName.storytellerFinished,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async () => {
          const websocket = await valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.ws?.getWebsocket();
          if (websocket !== undefined) {
            websocket.close();
          }
          valueObject.getPlugin(STORYTELLER_PLUG).state.defaultStates = valueObject.plugins.map((plugin) =>
            cloneDeep({ pluginName: plugin.name, state: plugin.state }),
          );
        },
      },
      {
        name: PrimaryHookName.beforeHook,
        handler: (valueObject: StorytellerValueObject<TStepName>) => async (payload) => {
          const websocket = await valueObject.getPlugin(STORYTELLER_PLUG).state.globalState.ws?.getWebsocket();
          if (websocket !== undefined) {
            //TODO make service usage optional (store events locally an if connection established send them)
            websocket.send(
              secureJsonStringify({
                eventName: "storytellerHookBefore",
                eventPayload: {
                  executionId,
                  hookName: payload.name,
                  hookPayload: payload.payload,
                  createdAt: DateTime.now().toISO(),
                },
              }),
            );
          }
        },
      },
    ],
  });
This is a Typescript code implementing the Storyteller plugin. The Storyteller plugin is a plugin for a test runner that helps run tests and generate test reports.

The plugin exports a function storytellerPlugin that takes a config object containing optional values testRunnerGetTestName and websocketUrl. The function returns a plugin object containing actions and hooks that can be used to run the tests.

The actions object contains two functions:

storytellerCreateStep: This function creates a test step and adds it to the plugin's state. It returns a function that runs the test and updates the state.
storytellerCreateStory: This function creates a test story and returns a function that runs the story and updates the state.
The hooks array contains functions that are called at different points during the test execution. Some examples of hooks are:

stepErrored: Called when a step errors.
stepStarted: Called when a step starts.
stepFinished: Called when a step finishes.
storyFinished: Called when a story finishes.
The plugin maintains a state object that keeps track of the number of stories created, started, finished, and errored, as well as the name of the current story and an array of steps. The plugin also initializes a websocket connection if a websocketUrl is provided.




Lukasz Klejszta
export const storytellerHelper = <TValueObject extends StorytellerValueObject<string>>(
  valueObject: TValueObject,
): StorytellerHelper<string, TValueObject> => {
  const storytellerCreatedPromise = valueObject.runHooks({
    name: StorytellerHookName.storytellerCreated,
  });
  valueObject.getPlugin(STORYTELLER_PLUG).hooks.unshift({
    name: StorytellerHookName.storyStarted,
    handler: () => () => storytellerCreatedPromise,
  });
  return {
    runHooks: valueObject.runHooks,
    createStep: valueObject.actions.storytellerCreateStep as any,
    createStory: valueObject.actions.storytellerCreateStory as any,
    composeSection: pipelineUnary,
  };
};

`
This is TypeScript code for a function called storytellerHelper that returns a StorytellerHelper object. The StorytellerHelper object has three methods:

runHooks: This method takes a name parameter and runs all hooks with that name in the valueObject.
createStep: This method creates a new step in the story and returns it.
createStory: This method creates a new story and returns it.
The storytellerHelper function takes a generic TValueObject parameter which extends StorytellerValueObject<string>. The valueObject parameter is an instance of this TValueObject type.

The function also uses a STORYTELLER_PLUG constant and two StorytellerHookName constants, which are not shown in the code snippet.




Lukasz Klejszta
storytellerPlugin "name.ts"
`
export const STORYTELLER_PLUG = "storyteller@1.0.0";
`
storytellerPlugin "types.ts"
`
import type { pipelineUnary } from "ts-pipe-compose";
import type { WebSocket } from "ws";
import type { HookDefinition, PrimaryHookDefinition } from "../../container/hook";
import type { Plugin, PluginAction, PluginName } from "../../container/plugin";
import type { Status, ValueObject } from "../../container/value-object";
import type { STORYTELLER_PLUG } from "./name";

export enum StorytellerStepStatus {
  created = "created",
  started = "started",
  finished = "finished",
  errored = "errored",
}

export interface StorytellerStep<
  TStepName extends string,
  TStorytellerStepStatus extends StorytellerStepStatus,
  TValueObject extends ValueObject<Status.forged, any, any>,
> {
  name: TStepName;
  status: TStorytellerStepStatus;
  handler: (actions: TValueObject["actions"]) => Promise<void>;
}

export enum StorytellerHookName {
  storytellerCreated = "storytellerCreated",
  storytellerFinished = "storytellerFinished",

  stepCreated = "stepCreated",
  stepStarted = "stepStarted",
  stepFinished = "stepFinished",
  stepErrored = "stepErrored",

  storyStarted = "storyStarted",
  storyFinished = "storyFinished",
  storyErrored = "storyErrored",

  arrangeStarted = "arrangeStarted",
  arrangeFinished = "arrangeFinished",
  arrangeErrored = "arrangeErrored",

  actStarted = "actStarted",
  actFinished = "actFinished",
  actErrored = "actErrored",

  assertStarted = "assertStarted",
  assertFinished = "assertFinished",
  assertErrored = "assertErrored",
}

export type StorytellerHookDefinition =
  | HookDefinition<
      StorytellerHookName.stepErrored,
      {
        error: Error;
        step: StorytellerStep<string, StorytellerStepStatus.errored, ValueObject<Status.forged, any, any>>;
      }
    >
  | HookDefinition<
      StorytellerHookName.stepFinished,
      { step: StorytellerStep<string, StorytellerStepStatus.finished, ValueObject<Status.forged, any, any>> }
    >
  | HookDefinition<
      StorytellerHookName.stepStarted,
      { step: StorytellerStep<string, StorytellerStepStatus.started, ValueObject<Status.forged, any, any>> }
    >
  | HookDefinition<
      StorytellerHookName.stepCreated,
      { step: StorytellerStep<string, StorytellerStepStatus.created, ValueObject<Status.forged, any, any>> }
    >
  | HookDefinition<StorytellerHookName.storyStarted, {}>
  | HookDefinition<StorytellerHookName.storyErrored, { error: Error }>
  | HookDefinition<StorytellerHookName.storyFinished, {}>
  | HookDefinition<StorytellerHookName.storytellerCreated, {}>
  | HookDefinition<StorytellerHookName.arrangeStarted, {}>
  | HookDefinition<StorytellerHookName.arrangeFinished, {}>
  | HookDefinition<StorytellerHookName.arrangeErrored, { error: Error }>
  | HookDefinition<StorytellerHookName.actStarted, {}>
  | HookDefinition<StorytellerHookName.actFinished, {}>
  | HookDefinition<StorytellerHookName.actErrored, { error: Error }>
  | HookDefinition<StorytellerHookName.assertStarted, {}>
  | HookDefinition<StorytellerHookName.assertFinished, {}>
  | HookDefinition<StorytellerHookName.assertErrored, { error: Error }>
  | HookDefinition<StorytellerHookName.storytellerFinished, {}>
  | PrimaryHookDefinition<any>;

export interface StorytellerState<
  TStepName extends string,
  TStep extends StorytellerStep<TStepName, StorytellerStepStatus, ValueObject<Status.forged, any, any>>,
  TState extends any,
> {
  steps: TStep[];
  globalState: {
    storiesCreatedAmount: number;
    storiesStartedAmount: number;
    storiesFinishedAmount: number;
    storiesErroredAmount: number;
    storyName: string;
    ws?: {
      getWebsocket: () => Promise<WebSocket>;
    };
  };
  defaultStates: { pluginName: string; state: TState }[];
}

export interface StorytellerActions<TStepName extends string> extends PluginAction<any, any, any> {
  storytellerCreateStory: (story: Story<TStepName, StorytellerValueObject<TStepName>>) => () => Promise<void>;
  storytellerCreateStep: (
    step: Omit<StorytellerStep<TStepName, StorytellerStepStatus, ValueObject<Status.forged, any, any>>, "status">,
  ) => {
    (actions: Promise<void> | void): Promise<void>;
    handler: typeof step.handler;
  };
}

export interface StorytellerPlugin<TStepName extends string>
  extends Plugin<
    typeof STORYTELLER_PLUG,
    StorytellerState<
      TStepName,
      StorytellerStep<TStepName, StorytellerStepStatus, ValueObject<Status.forged, any, any>>,
      any
    >,
    StorytellerActions<TStepName>,
    StorytellerHookDefinition
  > {}

export interface StorytellerValueObject<TStepName extends string>
  extends ValueObject<
    Status.forged,
    StorytellerHookDefinition,
    StorytellerPlugin<TStepName> | Plugin<PluginName, any, any, HookDefinition<string, any>>
  > {}

export interface TestRunnerNameGetters {
  name: string;
  getStoryName: () => string | void;
}

export type Section<TStepName extends string, TValueObject extends StorytellerValueObject<TStepName>> = (
  actions: TValueObject["actions"],
) => Promise<void>;

export enum SectionName {
  arrange = "arrange",
  act = "act",
  assert = "assert",
}

export type Story<TStepName extends string, TValueObject extends StorytellerValueObject<TStepName>> = {
  [key in SectionName]: Section<TStepName, TValueObject>;
};

export interface StorytellerHelper<TStepName extends string, TValueObject extends StorytellerValueObject<TStepName>> {
  runHooks: TValueObject["runHooks"];
  createStory: TValueObject["actions"]["storytellerCreateStory"];
  createStep: TValueObject["actions"]["storytellerCreateStep"] extends (
    step: Omit<StorytellerStep<infer UCreateStep, StorytellerStepStatus, TValueObject>, "status">,
  ) => (prevStepPromise: Promise<void> | void) => Promise<void>
    ? <TStep extends Omit<StorytellerStep<UCreateStep, StorytellerStepStatus, TValueObject>, "status">>(
        step: TStep,
      ) => {
        (actions: any): Promise<void>;
        handler: TStep["handler"];
      }
    : never;
  composeSection: typeof pipelineUnary;
}

`
This is a TypeScript module defining various types and interfaces related to a plugin called "storyteller".

The STORYTELLER_PLUG constant is defined as a string with the value "storyteller@1.0.0".

There is an enum called StorytellerStepStatus which defines possible statuses for a "step" in the storyteller plugin, which appears to be some kind of unit of work. The enum has four possible values: "created", "started", "finished", and "errored".

There is also an interface called StorytellerStep which defines the shape of a step, including its name, status, and handler function.

Another enum called StorytellerHookName defines various possible hooks that can be called during the execution of the storyteller plugin, such as when a story is started or when a step is finished.

The StorytellerHookDefinition type is a union of various HookDefinition types that correspond to the hooks defined in the StorytellerHookName enum.

The StorytellerState interface defines the shape of the state object used by the storyteller plugin, including an array of steps, a global state object, and an array of default states for other plugins.

The StorytellerActions interface extends the PluginAction interface and defines additional actions that can be performed in the storyteller plugin, such as creating a new story or a new step.

The StorytellerPlugin interface defines the shape of the storyteller plugin, including its plugin name, state, actions, and hooks.

The StorytellerValueObject interface extends the ValueObject interface and includes a reference to the StorytellerPlugin.

The TestRunnerNameGetters interface defines a shape for an object that includes a name and a function that returns the name of the current story.

The Section type defines a function that takes in a TValueObject and returns a promise that resolves when the section is completed.

The SectionName enum defines possible names for a section of a story, such as "arrange", "act", or "assert".

The Story type defines a shape for a story, including arrange, act, and assert sections.

Finally, the StorytellerHelper interface defines a set of methods that can be used to interact with the storyteller plugin, such as creating a new story or a new step, and running hooks.




Lukasz Klejszta
typeormPlugin "index.ts"
`
import type { DataSource, EntityManager } from "typeorm";
import { inspect } from "util";
import { errorPlugin } from "../../common/error";
import { logger } from "../../common/logger";
import { createPlugin } from "../../container/plugin";
import { StorytellerHookName } from "../storyteller/types";
import type { StorytellerHookDefinition } from "../storyteller/types";
import { TYPEORM_PLUG } from "./name";
import type {
  TypeormActions,
  TypeormDataSource,
  TypeormHookDefinition,
  TypeormPlugin,
  TypeormValueObject,
} from "./types";

export const typeormPlugin = <TDataSourceName extends string>(config: {
  dataSources: TypeormDataSource<TDataSourceName>[];
}) =>
  createPlugin<
    typeof TYPEORM_PLUG,
    TypeormActions<TDataSourceName>,
    TypeormHookDefinition | StorytellerHookDefinition,
    TypeormPlugin<TDataSourceName>
  >({
    name: TYPEORM_PLUG,
    state: {
      globalState: {
        dataSources: config.dataSources,
      },
      dataSourceChains: [],
    },
    actions: {
      typeormGetManager: (valueObject: TypeormValueObject<TDataSourceName>) => (payload) => {
        const container = valueObject
          .getPlugin(TYPEORM_PLUG)
          .state.globalState.dataSources.find(({ name }) => payload.name === name);
        if (container === undefined) {
          throw errorPlugin("missing data source");
        }
        return container.dataSource.manager;
      },
      typeormGetChains: (valueObject: TypeormValueObject<TDataSourceName>) => (payload) =>
        valueObject
          .getPlugin(TYPEORM_PLUG)
          .state.dataSourceChains.filter(({ name }) => name === payload.name)
          .map(({ chains }) => chains),
    },
    hooks: [
      {
        name: StorytellerHookName.storytellerFinished,
        handler: (valueObject: TypeormValueObject<TDataSourceName>) => async () => {
          const result = await Promise.allSettled(
            valueObject
              .getPlugin(TYPEORM_PLUG)
              .state.globalState.dataSources.map(async (container) => container.dataSource.destroy()),
          );
          result.forEach((element, index) => {
            if (element.status === "fulfilled") {
              logger.plugin(
                TYPEORM_PLUG,
                `Connection to '${
                  valueObject.getPlugin(TYPEORM_PLUG).state.globalState.dataSources[index].name
                }' destroyed`,
              );
            } else {
              logger.plugin(
                TYPEORM_PLUG,
                `Connection to '${
                  valueObject.getPlugin(TYPEORM_PLUG).state.globalState.dataSources[index].name
                }' could not be destroyed: ${inspect(element.reason)}`,
              );
            }
          });
        },
      },
      {
        name: StorytellerHookName.storytellerCreated,
        handler: (valueObject: TypeormValueObject<TDataSourceName>) => async () => {
          const connections = await Promise.allSettled(
            valueObject
              .getPlugin(TYPEORM_PLUG)
              .state.globalState.dataSources.map((container) => container.dataSource.initialize()),
          );
          connections.forEach((connection, index) =>
            logger.plugin(
              TYPEORM_PLUG,
              `Connection to '${
                valueObject.getPlugin(TYPEORM_PLUG).state.globalState.dataSources[index].name
              }' data source settled - ${connection.status}${
                connection.status === "fulfilled"
                  ? `: isInitialized - ${connection.value.isInitialized}`
                  : `: ${connection.reason}`
              }`,
            ),
          );
          if (connections.some(({ status }) => status === "rejected")) {
            throw errorPlugin(
              "could not establish connection to all data sources",
              connections.filter(({ status }) => status === "rejected"),
            );
          }
          valueObject.getPlugin(TYPEORM_PLUG).state.globalState.dataSources = await Promise.all(
            valueObject.getPlugin(TYPEORM_PLUG).state.globalState.dataSources.map(({ name }, index) => {
              const matchingConnection: PromiseSettledResult<DataSource> = connections[index];
              if (matchingConnection.status === "rejected") {
                throw errorPlugin("could not establish connection to all data sources", matchingConnection);
              }
              return { name, dataSource: matchingConnection.value };
            }),
          );
          const typeormTracker = (
            dataSourceName: TDataSourceName,
            manager: EntityManager,
            root: boolean,
          ): TypeormDataSource<TDataSourceName> =>
            Object.getOwnPropertyNames(Object.getPrototypeOf(manager)).reduce(
              (acc, name) => ({
                ...acc,
                //@ts-ignore
                [name]:
                  //@ts-ignore
                  typeof manager[name] !== "function"
                    ? //@ts-ignore
                      manager[name]
                    : (...args: any) => {
                        const chainIndex =
                          valueObject.getPlugin(TYPEORM_PLUG).state.dataSourceChains.length - (root === true ? 0 : 1);
                        if (valueObject.getPlugin(TYPEORM_PLUG).state.dataSourceChains[chainIndex] === undefined) {
                          valueObject.getPlugin(TYPEORM_PLUG).state.dataSourceChains[chainIndex] = {
                            name: dataSourceName,
                            chains: [],
                          };
                          logger.plugin(
                            TYPEORM_PLUG,
                            `${dataSourceName}.${name}(${args.map((arg: any) => inspect(arg)).join(",")})`,
                          );
                        } else {
                          logger.plugin(
                            TYPEORM_PLUG,
                            `${Array.from({ length: `${dataSourceName}`.length + 2 }).join(" ")} .${name}(${args
                              .map((arg: any) => inspect(arg))
                              .join(",")})`,
                          );
                        }
                        valueObject
                          .getPlugin(TYPEORM_PLUG)
                          .state.dataSourceChains[chainIndex].chains.push({ name, args });
                        //@ts-ignore
                        const result = manager[name].bind(manager)(...args);
                        if (result instanceof Promise) {
                          return result;
                        }
                        return typeormTracker(dataSourceName, result, false);
                      },
              }),
              {} as any,
            );
          valueObject.getPlugin(TYPEORM_PLUG).state.globalState.dataSources = valueObject
            .getPlugin(TYPEORM_PLUG)
            .state.globalState.dataSources.map((container) => ({
              name: container.name,
              dataSource: Object.assign(container.dataSource, {
                manager: typeormTracker(container.name, container.dataSource.manager, true),
              }),
            }));
        },
      },
    ],
  });

`
typeormPlugin "name.ts"
`
export const TYPEORM_PLUG = "typeorm@1.0.0";
`
typeormPlugin "types.ts"
`
import type { Plugin, PluginAction } from "../../container/plugin";
import type { DataSource } from "typeorm";
import type { StorytellerHookDefinition } from "../storyteller/types";
import type { TYPEORM_PLUG } from "./name";
import type { Status, ValueObject } from "../../container/value-object";

export enum TypeormHookName {}

export type TypeormHookDefinition = never;

export interface TypeormDataSource<TDataSourceName extends string> {
  name: TDataSourceName;
  dataSource: DataSource;
}

export interface TypeormChainElement {
  name: string;
  args: any[];
}

export interface TypeormState<TDataSourceName extends string> {
  globalState: {
    dataSources: TypeormDataSource<TDataSourceName>[];
  };
  dataSourceChains: { name: TDataSourceName; chains: TypeormChainElement[] }[];
}

export interface TypeormActions<TDataSourceName extends string> extends PluginAction<any, any, any> {
  typeormGetManager: (payload: { name: TDataSourceName }) => DataSource["manager"];
  typeormGetChains: (payload: { name: TDataSourceName }) => TypeormChainElement[][];
}

export type TypeormPlugin<TDataSourceName extends string> = Plugin<
  typeof TYPEORM_PLUG,
  TypeormState<TDataSourceName>,
  TypeormActions<TDataSourceName>,
  TypeormHookDefinition | StorytellerHookDefinition
>;

export type TypeormValueObject<TDataSourceName extends string> = ValueObject<
  Status.forged,
  TypeormHookDefinition | StorytellerHookDefinition,
  TypeormPlugin<TDataSourceName>
>;

`
This is a TypeScript module that defines a TypeORM plugin for use with a container system. The plugin defines a set of actions and hooks that can be used to manage TypeORM connections and queries within the container.

The typeormPlugin function takes a configuration object that specifies an array of TypeormDataSource objects, which represent individual TypeORM connections. The plugin creates a TypeormState object that stores information about the connections, and defines TypeormActions and TypeormHookDefinition interfaces for performing actions and responding to events.

The actions property defines two functions: typeormGetManager and typeormGetChains. These functions take a TypeormValueObject object as an argument, which represents the current state of the container, and return a DataSource object and an array of TypeormChainElement objects, respectively.

The hooks property defines two event handlers: storytellerFinished and storytellerCreated. These functions are called when the container is finished initializing or is about to be destroyed, respectively. The storytellerCreated hook establishes connections to the TypeORM data sources, while the storytellerFinished hook destroys the connections.

The module exports a constant TYPEORM_PLUG that can be used to reference the plugin in other parts of the code. The TypeormPlugin and TypeormValueObject interfaces are also exported for use in other parts of the code.




Lukasz Klejszta
I have applications with 3 main directories "docker", "tests" and "src".
In "src" directory there are application files. Those files are are used by application.
In "tests" directory there are tests files. Files with extension ".spec.ts" are used by jest to execute tests.
Files with ".ts" extension without ".spec.ts" contains shared parts that are used in ".spec.ts" file.

Tests are executed when application is running with environment variable APP_ENV equal "test".


I'm providing you my "tests" directory content there are now different files inside this directory
"tests/name-age.spec.ts" - file containing jest executable test cases
`/* eslint-disable no-console */
import { testFramework, StepName } from "./framework/framework";
import { arrangeAgifyEndpoint, arrangeClearAgeNamePairTable } from "./framework/arrange";
import {
  actAverageAgeEndpoint,
  actAverageAgeForNameEndpoint,
  actNameToAgeBatchEndpoint,
  actRequestsForAgeEndpoint,
} from "./framework/act";
import { ApiEndpointName, AppEndpointName } from "./framework/definitions";

const mockedAgifyResponses = [1, 2, 3, 4, 5];
jest.setTimeout(1000 * 30);
describe("feature/name-age", () => {
  it(
    "User needs to know what is the *age* for specific *name* / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: actNameToAgeBatchEndpoint({ names: ["Tom", "Bob", "Anna", "Hannah", "Alice"] }),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const agifyRequests = valueObject.expressGetExecutions({ endpointName: ApiEndpointName.getAge });
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.nameToAge });

          //? check is what we sent to the app fitting to what app sent to the mock server
          //? it may be a good idea to use unit tested encapsulated functions shared between application and tests for more advanced transformations
          expect(agifyRequests.map((agifyRequest) => agifyRequest.request.query.name)).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => {
              const path = nameToAgeResponse.response.request.path;
              return path.substring(path.lastIndexOf("/") + 1);
            }),
          );
          //? check is what mock server returned fitting to what app returned
          expect(mockedAgifyResponses).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age),
          );
        },
      }),
    }),
  );

  it(
    "User needs to know how many times asked for *age* for specific *name* / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Tom", "Tom", "Tom", "Tom"] }),
        actRequestsForAgeEndpoint({ name: "Tom" }),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.nameToAge });
          const requestsForAgeResponses = valueObject.axiosGetResponses({
            endpointName: AppEndpointName.requestsForAge,
          });
          expect(nameToAgeResponses.length).toStrictEqual(requestsForAgeResponses[0].response.data.amount);
        },
      }),
    }),
  );

  it(
    "User needs to know what is the *average age* for all people / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Bob", "Anna", "Hannah", "Alice"] }),
        actAverageAgeEndpoint(),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.averageAge });
          expect(nameToAgeResponses.length).toStrictEqual(1);
          expect(nameToAgeResponses[0].response.data.age).toStrictEqual(
            nameToAgeResponses
              .map((nameToAgeResponse) => nameToAgeResponse.response.data.age)
              .reduce((acc, val) => acc + val, 0) / nameToAgeResponses.length,
          );
        },
      }),
    }),
  );

  it(
    "User needs to know what is the *average age* for specific name / happy path",
    testFramework.createStory({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Tom", "Tom", "Tom", "Tom"] }),
        actAverageAgeForNameEndpoint({ name: "Tom" }),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.averageAgeForName });
          expect(nameToAgeResponses.length).toStrictEqual(1);
          expect(nameToAgeResponses[0].response.data.age).toStrictEqual(
            nameToAgeResponses
              .map((nameToAgeResponse) => nameToAgeResponse.response.data.age)
              .reduce((acc, val) => acc + val, 0) / nameToAgeResponses.length,
          );
        },
      }),
    }),
  );
});
`
"tests/framework/act.ts"
`
import { StatusCodes } from "http-status-codes";
import { AppEndpointName } from "./definitions";
import { testFramework, StepName } from "./framework";

export const actNameToAgeBatchEndpoint = (config: { names: string[] }) =>
  testFramework.createStep({
    name: StepName.actNameToAgeBatchEndpoint,
    handler: async (valueObject) => {
      for await (const name of config.names) {
        const result = await valueObject.axiosRequest({
          endpointName: AppEndpointName.nameToAge,
          config: async (definition) => ({ ...definition, url: `${definition.url}/${name}` }),
        });
        if (result.response.status !== StatusCodes.OK) {
          throw Error(
            `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
          );
        }
      }
    },
  });

export const actAverageAgeEndpoint = () =>
  testFramework.createStep({
    name: StepName.actAverageAgeEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: AppEndpointName.averageAge,
        config: async (definition) => definition,
      });
      if (result.response.status !== StatusCodes.OK) {
        throw Error(
          `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
        );
      }
    },
  });

export const actAverageAgeForNameEndpoint = (config: { name: string }) =>
  testFramework.createStep({
    name: StepName.actAverageAgeForNameEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: AppEndpointName.averageAgeForName,
        config: async (definition) => ({ ...definition, url: `${definition.url}/${config.name}` }),
      });
      if (result.response.status !== StatusCodes.OK) {
        throw Error(
          `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
        );
      }
    },
  });

export const actRequestsForAgeEndpoint = (config: { name: string }) =>
  testFramework.createStep({
    name: StepName.actRequestsForAgeEndpoint,
    handler: async (valueObject) => {
      const result = await valueObject.axiosRequest({
        endpointName: AppEndpointName.requestsForAge,
        config: async (definition) => ({ ...definition, url: `${definition.url}/${config.name}` }),
      });
      if (result.response.status !== StatusCodes.OK) {
        throw Error(
          `Request to '${AppEndpointName.requestsForAge}' failed with '${result.response.status}' status code`,
        );
      }
    },
  });

`

"/tests/framework/arrange.ts"
`
/* eslint-disable no-console */
import { StatusCodes } from "http-status-codes";
import { AgeNamePair } from "../../src/repository";
import { ApiEndpointName } from "./definitions";
import { testFramework, StepName, DataSourceName } from "./framework";

export const arrangeAgifyEndpoint = (payload: { age: number[] }) =>
  testFramework.createStep({
    name: StepName.arrangeAgifyEndpoint,
    handler: async (valueObject) => {
      await valueObject.expressMock({
        endpointName: ApiEndpointName.getAge,
        handlers: payload.age.map((age) => [
          async (req, res) => {
            res.status(StatusCodes.OK).send(JSON.stringify({ age }));
          },
        ]),
      });
    },
  });

export const arrangeClearAgeNamePairTable = () =>
  testFramework.createStep({
    name: StepName.arrangeClearAgeNamePairTable,
    handler: async (valueObject) => {
      await valueObject.typeormGetManager({ name: DataSourceName.postgres }).getRepository(AgeNamePair).delete({});
    },
  });
`

"/tests/framework/definitions.ts"
`
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

`
It seems like you have provided the contents of a test directory. The directory contains four files, name-age.spec.ts, act.ts, arrange.ts, and `definitions




Lukasz Klejszta
"tests/framework/framework.ts"
`
/* eslint-disable no-console */
import {
  compose,
  forgeValueObject,
  storytellerHelper,
  storytellerPlugin,
  createValueObject,
  expressPlugin,
  axiosPlugin,
  typeormPlugin,
} from "@micro-package/storyteller";
import { mockDefinitions, apiDefinitions } from "./definitions";
import type { ExpressMockDefinition, AxiosApiDefinition } from "./definitions";
import { env } from "../../config";
import { AgeNamePair } from "../../src/repository";
import { DataSource } from "typeorm";

export enum StepName {
  arrangeClearAgeNamePairTable = "arrangeClearAgeNamePairTable",
  arrangeAgifyEndpoint = "arrangeAgifyEndpoint",
  actNameToAgeBatchEndpoint = "actNameToAgeBatchEndpoint",
  actAverageAgeEndpoint = "actAverageAgeEndpoint",
  actAverageAgeForNameEndpoint = "actAverageAgeForNameEndpoint",
  actRequestsForAgeEndpoint = "actRequestsForAgeEndpoint",
  assert = "assert",
}

export enum DataSourceName {
  postgres = "postgres",
}

export const testFramework = compose(
  createValueObject(),
  expressPlugin<ExpressMockDefinition>({ port: Number(env.MOCK_SERVER_PORT), mockDefinitions }),
  axiosPlugin<AxiosApiDefinition>({ apiDefinitions }),
  storytellerPlugin<StepName>({ websocketUrl: env.STORYTELLER_WEBSOCKET_URL }),
  typeormPlugin({
    dataSources: [
      {
        name: DataSourceName.postgres,
        dataSource: new DataSource({
          type: "postgres",
          host: "postgres",
          database: env.POSTGRES_DB,
          password: env.POSTGRES_PASSWORD,
          username: env.POSTGRES_USERNAME,
          entities: [AgeNamePair],
        }),
      },
    ],
  }),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
`
It looks like the code you provided is a test suite for a Node.js application. The application is divided into three main directories: "docker", "tests", and "src". The "src" directory contains the application files, while the "tests" directory contains the test files.

The "tests" directory contains several files, including "name-age.spec.ts", which appears to contain the executable test cases written with the Jest testing framework. This file imports several functions from other files in the "framework" directory, which are used to arrange the environment for each test case, act on the system under test, and assert the expected results.

The "act.ts" file contains functions that define the actions to be taken on the system under test for each test case. These functions make HTTP requests to the application and mock API servers to simulate user interactions with the application.

The "arrange.ts" file contains functions that define the initial state of the system under test for each test case. These functions may clear the database or set up mock API servers to simulate the initial state of the system under test.

The "definitions.ts" file contains several enums and types used throughout the test suite to define the API endpoints and the expected data types for HTTP requests and responses.

Finally, the "framework.ts" file contains a composition of several plugins that help set up the testing environment. These plugins include the Express, Axios, and TypeORM plugins, which help mock API servers, make HTTP requests, and connect to a database, respectively. The Storyteller plugin is also included, which provides a visual interface for executing and monitoring the test cases.




Lukasz Klejszta

Could you describe as accurately as you can test case named "User needs to know what is the *average age* for specific name / happy path"?
Sure! This test case is designed to verify that the application can correctly calculate the average age of all people with a given name. Here are the steps it takes:

The arrangeClearAgeNamePairTable step is executed, which clears the AgeNamePair table in the application's database.
The arrangeAgifyEndpoint step is executed with mocked age data provided. This sets up a mock endpoint for the Agify API, which the application uses to get age data.
The actNameToAgeBatchEndpoint step is executed with a list of names provided. This simulates the user sending a request to the application to get age data for a specific name or names.
The actAverageAgeForNameEndpoint step is executed with a specific name provided. This simulates the user sending a request to the application to get the average age of all people with a specific name.
The assert step is executed to check if the application's response is correct. Specifically, it checks if the response contains the expected average age for the given name.
Overall, this test case ensures that the application is correctly retrieving and processing age data from the Agify API, as well as calculating and returning the average age of people with a specific name.




Lukasz Klejszta
Could you describe all interactions with tested application in test case named "User needs to know what is the *average age* for specific name / happy path"?
Sure, in the test case "User needs to know what is the average age for specific name / happy path", the test interacts with the tested application in the following way:

The test sets up the test environment by arranging the necessary mock server responses and clearing the data in the AgeNamePair table using the arrangeClearAgeNamePairTable and arrangeAgifyEndpoint functions.

The test then calls the actAverageAgeForNameEndpoint function, which sends a GET request to the /average-age/:name endpoint of the tested application. The name parameter is set to "Tom" in this case.

The tested application receives the request and calculates the average age of all people with the name "Tom" in the AgeNamePair table.

The tested application sends back a JSON response containing the calculated average age.

The test then asserts that the response status code is 200 OK and that the average age returned in the response is equal to the average age calculated by the test.

Finally, the test ends and the test environment is torn down.




Lukasz Klejszta
Could you describe how http request looks like in 2?
I'm sorry, but I don't have enough context to understand what you are referring to with "2". Could you please provide more information or clarify your question?




Lukasz Klejszta
Could you describe how http request send actAverageAgeForNameEndpoint looks like?
Based on the information you provided in the previous question, the HTTP request for the actAverageAgeForNameEndpoint might look something like this:

makefile
Copy code
GET /api/average-age?name=John HTTP/1.1
Host: example.com
Content-Type: application/json
Authorization: Bearer <access_token>
In this example, the request is a GET method that is being sent to the /api/average-age endpoint with a query parameter name set to John. The HTTP version is 1.1, and the Host header specifies the domain name of the server where the API is hosted. The Content-Type header specifies that the request body is in JSON format. Finally, the Authorization header includes an access token for authentication purposes.