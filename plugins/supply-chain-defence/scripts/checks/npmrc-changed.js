"use strict";
module.exports = async function npmrcChanged(input, state, config, cwd) {
  return { status: "info", message: ".npmrc change detected — review for unexpected modifications", details: {} };
};
