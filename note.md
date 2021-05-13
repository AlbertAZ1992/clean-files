```js
// check folders: downloads, desktop, documents
// file || folder types:
// -- .png, .jpeg, .jpg,
// -- .pptx, .ppt, .docx, .doc, .xls, .xls, .pdf, .key, .txt
// -- .log
// -- .dmg, .tgz, .zip, .json
// -- .mov, .mp4,
// -- .sketch
// -- folder

const fs = require('fs');
const path = require('path');
const FileType = require('file-type');

const checkingDirectories = [
  '/Users/albertaz/Downloads',
  '/Users/albertaz/Documents',
  '/Users/albertaz/Desktop',
];

async function checkDir(dirPath) {
  const resultTable = {};
  try {
    const files = await fs.promises.readdir(dirPath);
    for await (const filename of files) {
      const filePath = path.join(dirPath, filename);
      try {
        const stats = await fs.promises.stat(filePath);
        const isFile = stats.isFile(); //是文件
        const isDir = stats.isDirectory(); //是文件夹
        if (isFile) {
          const fileType = await FileType.fromFile(filePath);
          const ext = fileType ? fileType.ext : 'unknown';
          const mime = fileType ? fileType.mime : 'unknown';
          if (resultTable[ext]) {
            resultTable[ext] += 1;
          } else {
            resultTable[ext] = 1;
          }
        }
        if (isDir) {
          if (resultTable['dir']) {
            resultTable['dir'] += 1;
          } else {
            resultTable['dir'] = 1;
          }
        }

      } catch (err) {
        console.error(err);
      }
    }
    console.table(resultTable);
  } catch (err) {
    console.error(err);
  }
}

async function checkFolders() {
  for ( const dir of checkingDirectories) {
    await checkDir(dir);
  }
}

checkFolders();
```


```bash
➜  clean-files node index.js
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│ unknown │   31   │
│   zip   │   63   │
│   pdf   │  223   │
│  pptx   │   37   │
│   png   │   87   │
│   dir   │   77   │
│   jpg   │   11   │
│   cfb   │   4    │
│   mp4   │   7    │
│   xml   │   5    │
│   bz2   │   1    │
│   stl   │   1    │
│  xlsx   │   3    │
│   exe   │   1    │
│   psd   │   2    │
│   gz    │   3    │
│  docx   │   7    │
│   mov   │   6    │
│   gif   │   2    │
└─────────┴────────┘
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│ unknown │   2    │
│   dir   │   10   │
│   xml   │   1    │
│   zip   │   2    │
│   png   │   6    │
└─────────┴────────┘
┌─────────┬────────┐
│ (index) │ Values │
├─────────┼────────┤
│ unknown │   4    │
│   zip   │   9    │
│   png   │   45   │
│   pdf   │   10   │
│   dir   │   5    │
│   jpg   │   7    │
│  pptx   │   4    │
│   xml   │   1    │
│   mov   │   10   │
└─────────┴────────┘
➜  clean-files
```



```js
// check folders: downloads, desktop, documents
// file || folder types:
// -- .png, .jpeg, .jpg,
// -- .pptx, .ppt, .docx, .doc, .xls, .xls, .pdf, .key, .txt
// -- .log
// -- .dmg, .tgz, .zip, .json
// -- .mov, .mp4,
// -- .sketch
// -- folder

const fs = require('fs');
const path = require('path');
const FileType = require('file-type');

const CHECKING_DIRECTORIES = [
  '/Users/albertaz/Downloads',
  '/Users/albertaz/Documents',
  '/Users/albertaz/Desktop',
];

const ACTIONS = {
  DELETE: 'DELETE',
  MOVE: 'MOVE',
  SKIP: 'SKIP',
};

const DELETE_FILE_TYPES = [
  'png', 'jpeg', 'jpg',
  'gz', 'zip', 'exe',
  'mov', 'mp4', 'gif',
  'xml',
];

const SKIP_FILE_TYPES = [
  'unknown', 'dir'
];

const MOVE_FILE_TYPES = {
  'doc': [
    'pptx', 'ppt',
    'docx', 'doc',
    'xlsx', 'xls',
    'pdf',
  ],
  'workfile': ['psd', 'cfb', 'bz2', 'stl']
};


const FILETYP_ACTIONS_MAP = new Map();

const NOW = new Date().getTime();
const THRESHOLD = NOW - 2 * 30 * 24 * 60 * 60;

const skipResult = [];
const deleteResult = [];
const moveResult = [];

function FileInfo({ ext, mime, size, atimeMs, birthtimeMs, filename, filePath }) {
  this.filename = filename;
  this.filePath = filePath;
  this.ext = ext;
  this.mime = mime;
  this.size = size;
  this.atimeMs = atimeMs;
  this.birthtimeMs = birthtimeMs;
}

function makeFileTypeActions() {
  for (const type of SKIP_FILE_TYPES) {
    FILETYP_ACTIONS_MAP.set(type, {
      type: ACTIONS.SKIP
    });
  }
  for (const type of DELETE_FILE_TYPES) {
    if (FILETYP_ACTIONS_MAP.has(type) && FILETYP_ACTIONS_MAP.get(type) !== ACTIONS.SKIP) {
      FILETYP_ACTIONS_MAP.delete(type);
      FILETYP_ACTIONS_MAP.set(type, {
        type: ACTIONS.SKIP
      });
    } else {
      FILETYP_ACTIONS_MAP.set(type, {
        type: ACTIONS.DELETE
      });
    }
  }
  for (const categoryName in MOVE_FILE_TYPES) {
    const categoryTypes = MOVE_FILE_TYPES[categoryName];
    for (const type of categoryTypes) {
      if (FILETYP_ACTIONS_MAP.has(type) && FILETYP_ACTIONS_MAP.get(type) !== ACTIONS.SKIP) {
        FILETYP_ACTIONS_MAP.delete(type);
        FILETYP_ACTIONS_MAP.set(type, {
          type: ACTIONS.SKIP
        });
      } else {
        FILETYP_ACTIONS_MAP.set(type, {
          type: ACTIONS.MOVE,
          categoryName,
        });
      }

    }
  }
}

async function doFileActions(fileInfo) {
  const { ext, mime, size, atimeMs, birthtimeMs, filename, filePath } = fileInfo;
  if (!FILETYP_ACTIONS_MAP.get(ext)) {
    skipResult.push({
      ...fileInfo,
      action: ACTIONS.SKIP,
    });
    return;
  }
  if (FILETYP_ACTIONS_MAP.get(ext).type === ACTIONS.SKIP) {
    skipResult.push({
      ...fileInfo,
      action: ACTIONS.SKIP,
    });
    return;
  }

  if (FILETYP_ACTIONS_MAP.get(ext).type === ACTIONS.DELETE) {
    deleteResult.push({
      ...fileInfo,
      action: ACTIONS.DELETE,
    });

  }

  if (FILETYP_ACTIONS_MAP.get(ext).type === ACTIONS.MOVE) {
    moveResult.push({
      ...fileInfo,
      action: ACTIONS.MOVE,
      categoryName: FILETYP_ACTIONS_MAP.get(ext).categoryName,
    });
  }

  if (atimeMs < THRESHOLD) {
    deleteResult.push({
      ...fileInfo,
      action: 'delete',
    });
  }
}

async function actionLog() {
  const data = `
    \n --------- skip result
    ${skipResult.map(r => `${JSON.stringify(r)} \n`)}
    \n --------- move result
    ${moveResult.map(r => `${JSON.stringify(r)} \n`)}
    \n --------- delete result
    ${deleteResult.map(r => `${JSON.stringify(r)} \n`)}
  `;
  try {
    const logTime = new Date().getTime();
    const logFileName = `clean-files-${logTime}.log`;
    await fs.promises.writeFile(logFileName, data);
  } catch (err) {
    console.error(err);
  }
}

async function checkDir(dirPath) {

  try {
    const files = await fs.promises.readdir(dirPath);
    for await (const filename of files) {
      const filePath = path.join(dirPath, filename);
      try {
        const stats = await fs.promises.stat(filePath);
        const isFile = stats.isFile(); //是文件
        const isDir = stats.isDirectory(); //是文件夹
        const { size, atimeMs, birthtimeMs } = stats;

        if (isFile) {

          const fileType = await FileType.fromFile(filePath);
          const ext = fileType ? fileType.ext : 'unknown';
          const mime = fileType ? fileType.mime : 'unknown';
          const fileInfo = new FileInfo({ ext, mime, size, atimeMs, birthtimeMs, filename, filePath });

          await doFileActions(fileInfo);

        }
        if (isDir) {
          const ext = 'dir';
          const fileInfo = new FileInfo({ ext, size, atimeMs, birthtimeMs, filename, filePath });
          await doFileActions(fileInfo);
        }

      } catch (err) {
        console.error(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function checkFolders() {
  makeFileTypeActions();
  console.log(FILETYP_ACTIONS_MAP);
  for ( const dir of CHECKING_DIRECTORIES) {
    await checkDir(dir);
  }
  await actionLog();
}

checkFolders();
```



```js
// check folders: downloads, desktop, documents
// file || folder types:
// -- .png, .jpeg, .jpg,
// -- .pptx, .ppt, .docx, .doc, .xls, .xls, .pdf, .key, .txt
// -- .log
// -- .dmg, .tgz, .zip, .json
// -- .mov, .mp4,
// -- .sketch
// -- folder

const fs = require('fs');
const path = require('path');
const FileType = require('file-type');

const CHECKING_DIRECTORIES = [
  '/Users/albertaz/Downloads',
  '/Users/albertaz/Documents',
  '/Users/albertaz/Desktop',
];

const ACTIONS = {
  DELETE: 'DELETE',
  MOVE: 'MOVE',
  SKIP: 'SKIP',
};

const DELETE_FILE_TYPES = [
  'png', 'jpeg', 'jpg',
  'gz', 'zip', 'exe', 'dmg', 'pkg',
  'mov', 'mp4', 'gif',
  'xml', 'html',
  'sketch',
  'json',
  'xlsx', 'xls', 'csv',
];

const SKIP_FILE_TYPES = [
  'unknown', 'dir'
];

const MOVE_FILE_TYPES = {
  'doc': [
    'pptx', 'ppt',
    'docx', 'doc',

    'pdf',
  ],
  'workfile': ['psd', 'cfb', 'bz2', 'stl']
};


const FILETYP_ACTIONS_MAP = new Map();

const NOW = new Date().getTime();
const THRESHOLD = NOW - 2 * 30 * 24 * 60 * 60;

const skipResult = [];
const deleteResult = [];
const moveResult = [];

function FileInfo({ ext, size, atimeMs, birthtimeMs, filename, filePath }) {
  this.filename = filename;
  this.filePath = filePath;
  this.ext = ext;
  this.size = size;
  this.atimeMs = atimeMs;
  this.birthtimeMs = birthtimeMs;
}

function makeFileTypeActions() {
  for (const type of SKIP_FILE_TYPES) {
    FILETYP_ACTIONS_MAP.set(type, {
      type: ACTIONS.SKIP
    });
  }
  for (const type of DELETE_FILE_TYPES) {
    if (FILETYP_ACTIONS_MAP.has(type) && FILETYP_ACTIONS_MAP.get(type) !== ACTIONS.SKIP) {
      FILETYP_ACTIONS_MAP.delete(type);
      FILETYP_ACTIONS_MAP.set(type, {
        type: ACTIONS.SKIP
      });
    } else {
      FILETYP_ACTIONS_MAP.set(type, {
        type: ACTIONS.DELETE
      });
    }
  }
  for (const categoryName in MOVE_FILE_TYPES) {
    const categoryTypes = MOVE_FILE_TYPES[categoryName];
    for (const type of categoryTypes) {
      if (FILETYP_ACTIONS_MAP.has(type) && FILETYP_ACTIONS_MAP.get(type) !== ACTIONS.SKIP) {
        FILETYP_ACTIONS_MAP.delete(type);
        FILETYP_ACTIONS_MAP.set(type, {
          type: ACTIONS.SKIP
        });
      } else {
        FILETYP_ACTIONS_MAP.set(type, {
          type: ACTIONS.MOVE,
          categoryName,
        });
      }

    }
  }
}

async function doFileActions(fileInfo) {
  const { ext, size, atimeMs, birthtimeMs, filename, filePath } = fileInfo;
  if (!FILETYP_ACTIONS_MAP.get(ext)) {
    skipResult.push({
      ...fileInfo,
      action: ACTIONS.SKIP,
    });
    return;
  }
  if (FILETYP_ACTIONS_MAP.get(ext).type === ACTIONS.SKIP) {
    skipResult.push({
      ...fileInfo,
      action: ACTIONS.SKIP,
    });
    return;
  }

  if (FILETYP_ACTIONS_MAP.get(ext).type === ACTIONS.DELETE) {
    deleteResult.push({
      ...fileInfo,
      action: ACTIONS.DELETE,
    });

  }

  if (FILETYP_ACTIONS_MAP.get(ext).type === ACTIONS.MOVE) {
    moveResult.push({
      ...fileInfo,
      action: ACTIONS.MOVE,
      categoryName: FILETYP_ACTIONS_MAP.get(ext).categoryName,
    });
  }

  if (atimeMs < THRESHOLD) {
    deleteResult.push({
      ...fileInfo,
      action: 'delete',
    });
  }
}

async function actionLog() {
  const data = `
    \n --------- skip result
    ${skipResult.map(r => `${JSON.stringify(r)} \n`)}
    \n --------- move result
    ${moveResult.map(r => `${JSON.stringify(r)} \n`)}
    \n --------- delete result
    ${deleteResult.map(r => `${JSON.stringify(r)} \n`)}
  `;
  try {
    const logTime = new Date().getTime();
    const logFileName = `clean-files-${logTime}.log`;
    await fs.promises.writeFile(logFileName, data);
  } catch (err) {
    console.error(err);
  }
}

async function checkDir(dirPath) {

  try {
    const files = await fs.promises.readdir(dirPath);
    for await (const filename of files) {
      const filePath = path.join(dirPath, filename);
      try {
        const stats = await fs.promises.stat(filePath);
        const isFile = stats.isFile(); //是文件
        const isDir = stats.isDirectory(); //是文件夹
        const { size, atimeMs, birthtimeMs } = stats;

        if (isFile) {
          let ext = path.extname(filePath).replace('.', '');
          if (!ext) {
            const fileType = await FileType.fromFile(filePath);
            ext = fileType ? fileType.ext : 'unknown';
          }
          const fileInfo = new FileInfo({ ext, size, atimeMs, birthtimeMs, filename, filePath });

          await doFileActions(fileInfo);

        }
        if (isDir) {
          const ext = 'dir';
          const fileInfo = new FileInfo({ ext, size, atimeMs, birthtimeMs, filename, filePath });
          await doFileActions(fileInfo);
        }

      } catch (err) {
        console.error(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function checkFolders() {
  makeFileTypeActions();
  console.log(FILETYP_ACTIONS_MAP);
  for ( const dir of CHECKING_DIRECTORIES) {
    await checkDir(dir);
  }
  await actionLog();
}

checkFolders();
```



{
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
      "pptx", "ppt",
      "docx", "doc",
      "pdf"
    ],
    "workfile": ["psd", "cfb", "bz2", "stl"]
  },
  "logFilePath": "logs",
  "thresholdDay": 60,
  "scheduleCron": "0/5 * * * * ?"
}



async customFileType(filePath, filename) {
    if (filename === '@ali_proxylog 助力BFF开发.key' || filename === 'BFF解决方案探索-latest.key' || filename === 'BFF解决方案探索-latest.key' || filename === 'AEM产品介绍.key') {
      console.log(filePath)
      const start = 0;
      const end = 8;
      const fileBuffer = await fs.promises.readFile(filePath);
      console.log(fileBuffer);
      const fileChecker = fileBuffer.slice(start, end);
      console.log(fileChecker);
    }

  }


// Zip-based file formats
	// Need to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4])) { // Local file header signature
		try {


50 4b 03 04 14 00 00 00

