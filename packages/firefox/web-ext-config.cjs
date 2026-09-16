// Build the zip from the dist/ directory produced by build.ts.
module.exports = {
  sourceDir: "./dist",
  build: {
    filename: "mr-pinny-firefox-v{version}.zip",
    overwriteDest: true,
  },
};
