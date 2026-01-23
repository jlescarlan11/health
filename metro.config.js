const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('svg');
config.resolver.sourceExts.push('ts');
config.resolver.sourceExts.push('tsx');

module.exports = config;