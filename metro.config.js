const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, {
  isCSSEnabled: true,
});

config.resolver.unstable_enablePackageExports = false;

module.exports = config;
