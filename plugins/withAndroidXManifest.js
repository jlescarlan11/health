const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidXManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;
    
    // Ensure tools namespace is present
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = androidManifest.application[0];
    
    // Explicitly delete to avoid any multiple definition errors during merger if they exist
    delete application.$['android:appComponentFactory'];

    // Add tools:replace to resolve appComponentFactory conflict
    application.$['tools:replace'] = 'android:appComponentFactory';
    application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    return config;
  });
};
