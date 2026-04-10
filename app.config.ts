import type { ExpoConfig } from 'expo/config';

const appJson = require('./app.json') as { expo: ExpoConfig };
const pkg = require('./package.json') as { version: string };

function semverToVersionCode(version: string): number {
  const [majorRaw, minorRaw, patchRaw] = version.split('.');
  const major = Number(majorRaw) || 0;
  const minor = Number(minorRaw) || 0;
  const patch = Number(patchRaw) || 0;

  // Android versionCode integer olmalı.
  // 1.2.3 -> 10203 (MMmmpp)
  return major * 10000 + minor * 100 + patch;
}

export default (): ExpoConfig => {
  const version = pkg.version;
  const versionCode = semverToVersionCode(version);

  return {
    ...appJson.expo,
    version,
    ios: {
      ...appJson.expo.ios,
      buildNumber: String(versionCode),
    },
    android: {
      ...appJson.expo.android,
      versionCode,
    },
  };
};

