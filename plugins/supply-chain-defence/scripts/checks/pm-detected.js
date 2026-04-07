"use strict";
const packageManager = require("./package-manager");

module.exports = async function pmDetected(input, state, config, cwd) {
  return packageManager(input, state, config, cwd);
};
