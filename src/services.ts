// The app's single instances of the configuration, API client and login.

import { SisClient } from "./lib/api/client";
import { readConfig } from "./lib/config";
import { Session } from "./lib/session";

export const config = readConfig(window.SIS_CONFIG, window.location);

export const api = new SisClient({ baseUrl: config.apiUrl });

export const session = new Session(api, window.localStorage);
