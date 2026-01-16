#!/usr/bin/env node

/**
 * Post-prebuild script to add countdown and milestone widgets to the LiveActivity widget bundle.
 *
 * Run after `expo prebuild` to ensure OdakAheadWidget and OdakSinceWidget are registered.
 */

const fs = require("fs");
const path = require("path");

const bundlePath = path.join(
  __dirname,
  "..",
  "ios",
  "LiveActivity",
  "LiveActivityWidgetBundle.swift"
);

if (fs.existsSync(bundlePath)) {
  let contents = fs.readFileSync(bundlePath, "utf-8");

  // Check if widgets are already added
  if (!contents.includes("OdakAheadWidget")) {
    // Replace the widget bundle body to include all widgets
    contents = contents.replace(
      /var body: some Widget \{[\s\S]*?LiveActivityWidget\(\)[\s\S]*?\}/,
      `var body: some Widget {
    LiveActivityWidget()
    OdakAheadWidget()
    OdakSinceWidget()
  }`
    );

    fs.writeFileSync(bundlePath, contents);
    console.log("✓ Added countdown and milestone widgets to LiveActivityWidgetBundle");
  } else {
    console.log("✓ Widgets already registered in LiveActivityWidgetBundle");
  }
} else {
  console.log("⚠ LiveActivityWidgetBundle.swift not found - run expo prebuild first");
}
