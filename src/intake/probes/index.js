"use strict";

const { runFamily1Probe } = require("../families/family1.probe.js");
const { runFamily2Probe } = require("../families/family2.probe.js");
const { runFamily3Probe } = require("../families/family3.probe.js");

module.exports = Object.freeze({
  runFamily1Probe,
  runFamily2Probe,
  runFamily3Probe
});