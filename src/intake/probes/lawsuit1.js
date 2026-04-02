"use strict";

const { matchesFamily1 } = require("../families/family1.matcher.js");
const { runFamily1Probe } = require("../families/family1.probe.js");

module.exports = Object.freeze({
  matchesLawsuit1: matchesFamily1,
  runLawsuit1Probe: runFamily1Probe
});