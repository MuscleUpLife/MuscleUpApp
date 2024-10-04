const { withAndroidManifest } = require('@expo/config-plugins');

const withCustomAndroidManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Enable cleartext traffic for HTTP
    androidManifest.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';

    // Enable OnBackInvokedCallback for Android 13+
    androidManifest.manifest.application[0].$['android:enableOnBackInvokedCallback'] = 'true';

    return config;
  });
};

module.exports = withCustomAndroidManifest;
