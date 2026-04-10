const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, {
  isCSSEnabled: true,
});

config.resolver.unstable_enablePackageExports = false;

// Force tslib to resolve to the pure ESM version to avoid CJS/ESM interop
// issues on web ("Cannot destructure property '__extends' of 'tslib.default'")
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib' && platform === 'web') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/tslib/tslib.es6.mjs'),
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
