import { createApp } from "./app";

const app = createApp().listen(Number(process.env.PORT ?? 3000));
console.log(`Darasa API on ${app.server?.hostname}:${app.server?.port}`);
