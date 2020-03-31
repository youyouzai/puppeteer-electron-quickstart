//#region Imports
// Library ----------------------------------------------------------------------------------
import { Logger } from './lib/logger';
import { FilePaths } from './lib/file-paths.js';
import { PuppeteerWrapper } from './lib/puppeteer-wrapper';

const electron = require('electron');
const ipcMain = electron.remote.ipcMain;
var create = require('./lib/create');
var remove = require('./lib/remove')

//#endregion

//#region Setup - Dependency Injection-----------------------------------------------
const _logger = new Logger();
const _filePaths = new FilePaths(_logger, "puppeteer-electron-quickstart");
const _puppeteerWrapper = new PuppeteerWrapper(_logger, _filePaths,
    { headless: false, width:1920, height: 1080 });

//#endregion

//#region Main ----------------------------------------------------------------------
async function removeProduct(data) {
    await remove(_puppeteerWrapper, data, _logger);
}
async function createProduct(data) {
    await create(_puppeteerWrapper, data, _logger);
}
async function checkChromeSet() {
    try {
        return await _puppeteerWrapper.setup();
    } catch(e) {
        _logger.logError('Thrown error:');
        _logger.logError(e);
    } finally {
        await _puppeteerWrapper.cleanup();
    }

    _logger.logInfo('Done. Close window to exit');

    await _logger.exportLogs(_filePaths.logsPath());
}
(async()=> {
    const chromeSet = await checkChromeSet()
    if(!chromeSet) return;
    ipcMain.on('remove',async (event,data)=>{
        await removeProduct(data);
    });
    ipcMain.on('create',async(event, data)=>{
        await createProduct(data);
    })
})()

//#endregion