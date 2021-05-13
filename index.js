const schedule = require('node-schedule');
const config = require('./.cf-config.js');
const Cleanfiles = require('./lib/cleanfiles');


const cleanfiles = new Cleanfiles(config);

if (config.scheduleCron) {
  schedule.scheduleJob(config.scheduleCron, () => {
    console.log(`Starting a clean files task at ${new Date().toLocaleString()}`);
    cleanfiles.start();
  });
} else {
  console.log(`Starting a clean files task at ${new Date().toLocaleString()}`);
  cleanfiles.start();
}

