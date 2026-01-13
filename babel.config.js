module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      // Unistyles v3 Babel plugin - root must be a specific folder, not project root
      ["react-native-unistyles/plugin", {
        root: "app",
        autoProcessImports: ["react-native-unistyles"]
      }],
    ],
  };
};
