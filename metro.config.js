const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
