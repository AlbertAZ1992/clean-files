'use strict';

module.exports = {
  "checkingDirectories": [
    "/Users/albertaz/Downloads",
    "/Users/albertaz/Documents",
    "/Users/albertaz/Desktop"
  ],
  "deleteFileTypes": [
    "png", "jpeg", "jpg",
    "gz", "zip", "exe", "dmg", "pkg",
    "mov", "mp4", "gif",
    "xml", "html", "svg",
    "sketch",
    "json",
    "xlsx", "xls", "csv", "numbers"
  ],
  "moveFileTypes": {
    "doc": [
      "pptx", "ppt", ".key",
      "docx", "doc",
      "pdf"
    ],
    "workfile": ["psd", "cfb", "bz2", "stl"]
  },
  "customMagicNumberMap": {
    "sketch": [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00],
    "dmg": [0x78, 0xda, 0x63, 0x60, 0x18, 0x05, 0x43, 0x18, 0xfc, 0xfb, 0xff, 0xff, 0x1d, 0x10, 0x33, 0x02, 0x99]
  },
  "logFilePath": "logs",
  "thresholdDay": 60,
  "scheduleCron": ""
};

