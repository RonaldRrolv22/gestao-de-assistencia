/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type ExpressApp = import("express").Application;

let appHandler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appHandler) {
    const serverModule = require("../dist/server.cjs") as {
      createApp: () => Promise<ExpressApp>;
    };
    const app = await serverModule.createApp();
    appHandler = (request, response) => app(request, response);
  }
  return appHandler(req, res);
}
