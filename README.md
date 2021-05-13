# clean-files

## Install
Clone repository:

```bash
$ git clone https://github.com/AlbertAZ1992/clean-files.git && cd clean-files
```

Install dependencies:

```
$ npm install
```

## Usage

Modify `.cf-config.js` as your perspective:

```js
'use strict';

module.exports = {
  "checkingDirectories": [
    "/Users/${your-user-name}/Downloads",
    "/Users/${your-user-name}/Documents",
    "/Users/${your-user-name}/Desktop"
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
  "scheduleCron": "0 0 2 20 * ?"
};
```

Start the Task:
```bash
$ npm run start
```


