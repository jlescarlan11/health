const { withGradleProperties } = require('@expo/config-plugins');

const withGradleMemory = (config) => {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => item.key !== 'org.gradle.jvmargs'
    );
    config.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError',
    });
    return config;
  });
};

module.exports = withGradleMemory;
