const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration for the SmartPayFresh example app.
 *
 * If you need to link local SDK packages for development, add watchFolders
 * and extraNodeModules entries pointing to your local package directories.
 * For production/npm usage, the default config is sufficient.
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);