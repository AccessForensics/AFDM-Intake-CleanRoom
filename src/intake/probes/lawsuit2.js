"use strict";

const { matchesFamily2 } = require("../families/family2.matcher.js");
const { runFamily2Probe } = require("../families/family2.probe.js");

module.exports = Object.freeze({
  matchesLawsuit2: matchesFamily2,
  runLawsuit2Probe: runFamily2Probe
});