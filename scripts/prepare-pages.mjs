import { copyFile } from "node:fs/promises";

await copyFile("dist/knowcanvas/index.js", "dist/client/_worker.js");
