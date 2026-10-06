module.exports = {
  hooks: {
    readPackage(packageManifest) {
      // Yarn resolved npm's bundled dependencies through its security overrides.
      if (
        packageManifest.name === "npm" &&
        packageManifest.version === "11.16.0"
      ) {
        delete packageManifest.bundleDependencies
        delete packageManifest.bundledDependencies
      }
      return packageManifest
    },
  },
}
