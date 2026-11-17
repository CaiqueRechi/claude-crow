// Reads an application's access map (modules, presets, screens) from the private
// data the setup encrypted into ~/.claude/crow/private/<app>/acessos.json.enc,
// handing out only the part a skill asks for.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crowHome, readEncrypted } from "./vault.mjs";

export function accessMapFile(app) {
  return join(crowHome(), "private", app, "acessos.json.enc");
}

export function availableApps() {
  const folder = join(crowHome(), "private");
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter((name) => existsSync(accessMapFile(name)));
}

export function loadAccessMap(app) {
  if (!existsSync(accessMapFile(app))) throw new Error(`no access map for ${app}; available: ${availableApps().join(", ") || "none"}`);
  return JSON.parse(readEncrypted(accessMapFile(app)));
}

export const queries = {
  apps: () => ({ apps: availableApps() }),
  index: (app) => loadAccessMap(app).index,
  vocabulary: (app) => {
    const map = loadAccessMap(app);
    return { about: map.about, user_levels: map.user_levels, user_types: map.user_types };
  },
  preset: (app, reference) => {
    const [moduleKey, presetKey] = reference.split(".");
    const preset = loadAccessMap(app).modules[moduleKey]?.presets[presetKey];
    if (!preset) throw new Error(`no preset ${reference} in ${app}`);
    return { reference, module: moduleKey, ...preset };
  },
  module: (app, moduleKey) => {
    const module = loadAccessMap(app).modules[moduleKey];
    if (!module) throw new Error(`no module ${moduleKey} in ${app}`);
    return { ...module, presets: Object.fromEntries(Object.entries(module.presets).map(([key, preset]) => [key, preset.label])) };
  },
  screen: (app, screenKey) => {
    const screen = loadAccessMap(app).screens[screenKey];
    if (!screen) throw new Error(`no screen ${screenKey} in ${app}`);
    return { screen: screenKey, ...screen };
  },
  // Presets that can and cannot do one action on a screen, for positive and negative tests.
  "who-can": (app, screenKey, action = "create") => {
    const map = loadAccessMap(app);
    const can = [];
    const cannot = [];
    for (const [moduleKey, module] of Object.entries(map.modules)) {
      for (const [presetKey, preset] of Object.entries(module.presets)) {
        const grant = preset.permissions.find((permission) => permission.screen === screenKey);
        const reference = `${moduleKey}.${presetKey}`;
        if (preset.global_admin || grant?.[action]) can.push({ reference, scope: preset.global_admin ? "global_admin" : grant[action], label: preset.label });
        else if (map.screens[screenKey]?.modules.includes(moduleKey)) cannot.push({ reference, label: preset.label });
      }
    }
    return { screen: screenKey, action, can, cannot };
  },
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [query, ...args] = process.argv.slice(2);
  try {
    if (!queries[query]) throw new Error(`unknown query ${query}; use ${Object.keys(queries).join(", ")}`);
    console.log(JSON.stringify(queries[query](...args)));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
