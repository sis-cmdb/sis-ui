// Runtime configuration (window.SIS_CONFIG, set by config.js; see
// public/config-compat.js).

export interface Config {
    // base url of the SIS API, without /api/<version>
    apiUrl: string;
}

// location: the page's own url; without an API_URL in config.js the API is
// expected in the directory the UI was loaded from
export function readConfig(config: Window["SIS_CONFIG"], location: { origin: string; pathname: string }): Config {
    const apiUrl = config?.API_URL || location.origin + location.pathname.replace(/[^/]*$/, "");
    return { apiUrl: apiUrl.replace(/\/+$/, "") };
}
