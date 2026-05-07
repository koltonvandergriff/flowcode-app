import { app } from 'electron';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync, mkdirSync } from 'fs';

export class PluginManager {
  constructor(settingsStore) {
    this.settingsStore = settingsStore;
    this.pluginsDir = join(app.getPath('userData'), 'flowade-plugins');
    if (!existsSync(this.pluginsDir)) {
      mkdirSync(this.pluginsDir, { recursive: true });
    }
  }

  /**
   * Get the path to the plugins directory.
   */
  getPluginsPath() {
    return this.pluginsDir;
  }

  /**
   * Read a plugin's manifest (plugin.json) from its folder.
   * Returns null if invalid or missing.
   */
  getPluginManifest(name) {
    const manifestPath = join(this.pluginsDir, name, 'plugin.json');
    if (!existsSync(manifestPath)) return null;

    try {
      const raw = readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);

      // Validate required fields
      if (!manifest.name || !manifest.version) return null;

      return {
        name: manifest.name,
        version: manifest.version || '0.0.0',
        description: manifest.description || '',
        author: manifest.author || 'Unknown',
        capabilities: Array.isArray(manifest.capabilities) ? manifest.capabilities : [],
        folderName: name,
      };
    } catch {
      return null;
    }
  }

  /**
   * Scan the plugins directory and return manifests for all valid plugins.
   */
  listPlugins() {
    if (!existsSync(this.pluginsDir)) return [];

    const enabledPlugins = this.settingsStore.get('enabledPlugins') || {};

    try {
      const entries = readdirSync(this.pluginsDir, { withFileTypes: true });
      const plugins = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const manifest = this.getPluginManifest(entry.name);
        if (!manifest) continue;

        plugins.push({
          ...manifest,
          enabled: enabledPlugins[entry.name] !== false, // enabled by default
        });
      }

      return plugins;
    } catch {
      return [];
    }
  }

  /**
   * Load a plugin by name. MVP stub -- just validates the manifest exists.
   * Returns the manifest if valid, null otherwise.
   */
  loadPlugin(name) {
    const manifest = this.getPluginManifest(name);
    if (!manifest) return null;

    // MVP: actual plugin code execution is a stub.
    // In the future this would require() or import() the plugin entry point.
    return manifest;
  }

  /**
   * Enable a plugin by folder name.
   */
  enablePlugin(name) {
    const enabledPlugins = this.settingsStore.get('enabledPlugins') || {};
    enabledPlugins[name] = true;
    this.settingsStore.set('enabledPlugins', enabledPlugins);
    return true;
  }

  /**
   * Disable a plugin by folder name.
   */
  disablePlugin(name) {
    const enabledPlugins = this.settingsStore.get('enabledPlugins') || {};
    enabledPlugins[name] = false;
    this.settingsStore.set('enabledPlugins', enabledPlugins);
    return true;
  }
}
