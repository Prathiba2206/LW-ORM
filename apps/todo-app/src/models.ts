import { boolean, defineModel, serial, string } from "@prathiba/light-orm";

export const Todo = defineModel("todo", {
  id: serial(),
  title: string(),
  completed: boolean({ default: false }),
});
