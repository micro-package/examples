/* eslint-disable @typescript-eslint/naming-convention */
import type { Plugin, PluginAction } from "@micro-package/container/plugin";
import { createPlugin } from "@micro-package/container/plugin";
import type { Status, ValueObject } from "@micro-package/container/value-object";

export const ___________PLUG = "stepFunctions@1.0.0";

export enum ____________HookName {}

export type ____________HookDefinition = never;

export interface ____________State {}

export interface ____________Actions extends PluginAction<any, any, any> {}

export type ____________Plugin = Plugin<
  typeof ___________PLUG,
  ____________State,
  ____________Actions,
  ____________HookDefinition
>;

export type ____________ValueObject = ValueObject<Status.forged, ____________HookDefinition, ____________Plugin>;

export const ____Plugin = createPlugin<
  typeof ___________PLUG,
  ____________Actions,
  ____________HookDefinition,
  ____________Plugin
>({
  name: ___________PLUG,
  requiredPlugins: [],
  state: {},
  actions: {},
  hooks: [],
});
