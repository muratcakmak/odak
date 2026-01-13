module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      // Unistyles v3 Babel plugin - must process ALL folders with StyleSheet.create
      ["react-native-unistyles/plugin", {
        root: ["app", "components", "theme"],
      }],
    ],
  };
};
