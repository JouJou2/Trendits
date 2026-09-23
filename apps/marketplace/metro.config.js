// Lets the app import the website's pure logic (category rules, search
// ranking, product types) from frontend/src instead of keeping a second copy
// that could drift. Only that folder is watched — not the whole frontend,
// whose own node_modules would otherwise be picked up alongside the app's.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../../frontend/src')];

module.exports = config;
