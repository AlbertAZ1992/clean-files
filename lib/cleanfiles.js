const fs = require('fs');
const path = require('path');
const FileType = require('file-type');

class CustomFileChecker {
  constructor(customFileCheckMap) {
    this.FIlE_CHECKERS = new Map();
    this.initFileCheckers(customFileCheckMap);
  }

  initFileCheckers(customFileCheckMap = {}) {
    for (const ext in customFileCheckMap) {
      ext && this.FIlE_CHECKERS.set(ext, customFileCheckMap[ext]);
    }
  }

  checkeFileType(fileBufferHeader) {
    for (let [ext, magicNumber] of this.FIlE_CHECKERS) {
      const match = magicNumber.every((number, index) => number === fileBufferHeader[index]);
      if (match) {
        return { ext };
      }
    }
    return { ext: 'unknown' };
  }

}

class CleanFiles {
  constructor(config) {
    this.CHECKING_DIRECTORIES = config.checkingDirectories || [];
    this.ACTIONS = {
      DELETE: 'DELETE',
      MOVE: 'MOVE',
      SKIP: 'SKIP',
    };
    this.SKIP_FILE_TYPES = [ 'unknown', 'dir'];
    this.FILETYPE_ACTIONS = new Map();
    this.DELETE_FILE_TYPES = config.deleteFileTypes || [];
    this.MOVE_FILE_TYPES = config.moveFileTypes || {};
    this.logFilePath = config.logFilePath;
    this.THRESHOLD_DAY = config.thresholdDay;
    this.THRESHOLD = null;
    this.customFileChecker = new CustomFileChecker(config.customMagicNumberMap);

    this.skipResult = [];
    this.deleteResult = [];
    this.moveResult = [];
    this.makeFileTypeActions();
  }

  resetActionState() {
    this.THRESHOLD = this.THRESHOLD_DAY ? new Date().getTime() - this.THRESHOLD_DAY * 24 * 60 * 60 : 0;
    this.skipResult = [];
    this.deleteResult = [];
    this.moveResult = [];
  }

  makeFileTypeActions() {
    for (const type of this.SKIP_FILE_TYPES) {
      this.FILETYPE_ACTIONS.set(type, {
        type: this.ACTIONS.SKIP
      });
    }
    for (const type of this.DELETE_FILE_TYPES) {
      if (this.FILETYPE_ACTIONS.has(type) && this.FILETYPE_ACTIONS.get(type) !== this.ACTIONS.SKIP) {
        this.FILETYPE_ACTIONS.delete(type);
        this.FILETYPE_ACTIONS.set(type, {
          type: this.ACTIONS.SKIP
        });
      } else {
        this.FILETYPE_ACTIONS.set(type, {
          type: this.ACTIONS.DELETE
        });
      }
    }
    for (const categoryName in this.MOVE_FILE_TYPES) {
      const categoryTypes = this.MOVE_FILE_TYPES[categoryName];
      for (const type of categoryTypes) {
        if (this.FILETYPE_ACTIONS.has(type) && this.FILETYPE_ACTIONS.get(type) !== this.ACTIONS.SKIP) {
          this.FILETYPE_ACTIONS.delete(type);
          this.FILETYPE_ACTIONS.set(type, {
            type: this.ACTIONS.SKIP
          });
        } else {
          this.FILETYPE_ACTIONS.set(type, {
            type: this.ACTIONS.MOVE,
            categoryName,
          });
        }

      }
    }
  }

  async doFileActions (fileInfo, dirPath) {
    const { ext, size, atimeMs, birthtimeMs, filename, filePath } = fileInfo;
    if (!this.FILETYPE_ACTIONS.get(ext) || this.FILETYPE_ACTIONS.get(ext).type === this.ACTIONS.SKIP) {
      this.skipResult.push({
        ...fileInfo,
        action: this.ACTIONS.SKIP,
      });
      return;
    }

    if (this.FILETYPE_ACTIONS.get(ext).type === this.ACTIONS.MOVE) {
      const categoryName = this.FILETYPE_ACTIONS.get(ext).categoryName;
      this.moveResult.push({
        ...fileInfo,
        action: this.ACTIONS.MOVE,
        categoryName,
      });
      try {
        if (!fs.existsSync(path.join(dirPath, categoryName))) {
          await fs.promises.mkdir(path.join(dirPath, categoryName));
        }
        await fs.promises.rename(filePath, path.join(dirPath, categoryName, filename));
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (this.FILETYPE_ACTIONS.get(ext).type === this.ACTIONS.DELETE || (this.THRESHOLD && atimeMs < this.THRESHOLD)) {
      this.deleteResult.push({
        ...fileInfo,
        action: 'delete',
      });
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.error(err);
      }
      return;
    }
  }

  async actionLog() {
    const data = `
      \n --------- skip result
      ${this.skipResult.map(r => `${JSON.stringify(r)} \n`)}
      \n --------- move result
      ${this.moveResult.map(r => `${JSON.stringify(r)} \n`)}
      \n --------- delete result
      ${this.deleteResult.map(r => `${JSON.stringify(r)} \n`)}
    `;
    try {
      const logTime = new Date().getTime();
      if (!fs.existsSync(path.join(process.cwd(), this.logFilePath))) {
        await fs.promises.mkdir(path.join(process.cwd(), this.logFilePath));
      }
      const logFileName = path.join(process.cwd(), this.logFilePath, `clean-files-${logTime}.log`);
      // console.log(logFileName);
      await fs.promises.writeFile(logFileName, data);
    } catch (err) {
      console.error(err);
    }
  }

  async customFileType(filePath, filename) {
    const start = 0;
    const end = 20;
    const fileBuffer = await fs.promises.readFile(filePath);
    const fileHeader = fileBuffer.slice(start, end);
    const { ext } = this.customFileChecker.checkeFileType(fileHeader);
    return ext;
  }

  async checkDir(dirPath) {

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
            let ext = await this.customFileType(filePath, filename);
            if (!ext || ext === 'unknown') {
              const fileType = await FileType.fromFile(filePath, filename);
              ext = fileType ? fileType.ext : 'unknown';
            }
            const fileInfo = { ext, size, atimeMs, birthtimeMs, filename, filePath };

            await this.doFileActions(fileInfo, dirPath);

          }
          if (isDir) {
            const ext = 'dir';
            const fileInfo = { ext, size, atimeMs, birthtimeMs, filename, filePath };
            await this.doFileActions(fileInfo, dirPath);
          }

        } catch (err) {
          console.error(err);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async start() {
    this.resetActionState();
    for ( const dir of this.CHECKING_DIRECTORIES) {
      await this.checkDir(dir);
    }
    await this.actionLog();
  }
};

module.exports = CleanFiles;