import type { HookDefinition } from "@micro-package/storyteller/container/hook";
import type { Plugin, PluginAction } from "@micro-package/storyteller/container/plugin";
import { createPlugin } from "@micro-package/storyteller/container/plugin";
import type { Status, ValueObject } from "@micro-package/storyteller/container/value-object";

export const EXAMPLE_PLUG = "example@1.0.0";

export enum ExampleHookName {
  messagesAppended = "messagesAppended",
  messagesRequested = "messagesRequested",
}

export type ExampleHookDefinition =
  | HookDefinition<ExampleHookName.messagesAppended, { message: string }>
  | HookDefinition<ExampleHookName.messagesRequested, {}>;

export interface ExampleState {
  messages: string[];
}

export interface ExampleActions extends PluginAction<any, any, any> {
  //* plugin action name must start with plugin name (without version)
  exampleAddMessage: (payload: { message: string }) => Promise<void>;
  exampleGetMessages: () => Promise<string[]>;
}

export type ExamplePlugin = Plugin<typeof EXAMPLE_PLUG, ExampleState, ExampleActions, ExampleHookDefinition>;

export type ExampleValueObject = ValueObject<Status.forged, ExampleHookDefinition, ExamplePlugin>;

export const examplePlugin = createPlugin<typeof EXAMPLE_PLUG, ExampleActions, ExampleHookDefinition, ExamplePlugin>({
  name: EXAMPLE_PLUG,
  state: {
    messages: [],
  },
  actions: {
    exampleAddMessage:
      (valueObject: ExampleValueObject) =>
      async ({ message }) => {
        valueObject.getPlugin(EXAMPLE_PLUG).state.messages.push(message);
        await valueObject.runHooks({ name: ExampleHookName.messagesAppended, payload: { message } });
      },
    exampleGetMessages: (valueObject: ExampleValueObject) => async () => {
      await valueObject.runHooks({ name: ExampleHookName.messagesRequested });
      return valueObject.getPlugin(EXAMPLE_PLUG).state.messages;
    },
  },
  hooks: [],
});
