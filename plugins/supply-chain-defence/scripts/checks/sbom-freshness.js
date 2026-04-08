"use strict";

const fs = require("fs");
const path = require("path");

const SBOM_FILES = ["sbom.json", "sbom.xml", "bom.json", "bom.xml"];
const STALE_DAYS = 30;

module.exports = async function sbomFreshness(input, state, config, cwd) {
  for (const file of SBOM_FILES) {
    const filePath = path.join(cwd, file);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const ageDays = (Date.now() - stat.mtimeMs) / (24 * 3600 * 1000);

      if (ageDays > STALE_DAYS) {
        return {
          status: "warn",
          message:
            `SBOM file ${file} is ${Math.floor(ageDays)} days old. ` +
            `Regenerate with: npx @cyclonedx/cyclonedx-npm --output-file ${file}`,
          details: { file, ageDays: Math.floor(ageDays) },
        };
      }

      return {
        status: "pass",
        message: `SBOM file ${file} is ${Math.floor(ageDays)} days old`,
        details: { file, ageDays: Math.floor(ageDays) },
      };
    }
  }

  return {
    status: "info",
    message:
      "No SBOM file found (optional). Generate with: npx @cyclonedx/cyclonedx-npm --output-file sbom.json",
    details: {},
  };
};
