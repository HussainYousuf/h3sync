"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sync = exports.watch = exports.init = void 0;
const axios_1 = __importDefault(require("axios"));
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const path_1 = require("path");
const form_data_1 = __importDefault(require("form-data"));
const readline_sync_1 = require("readline-sync");
const fileMap = {};
fileMap.appcache = "APPCACHE";
fileMap.dwf = "AUTOCAD";
fileMap.dwg = "AUTOCAD";
fileMap.dxf = "AUTOCAD";
fileMap.dwf = "AUTOCAD";
fileMap.dwt = "AUTOCAD";
fileMap.plt = "AUTOCAD";
fileMap.bmp = "BMPIMAGE";
fileMap.cer = "CERTIFICATE";
fileMap.crl = "CERTIFICATE";
fileMap.crt = "CERTIFICATE";
fileMap.csr = "CERTIFICATE";
fileMap.der = "CERTIFICATE";
fileMap.key = "CERTIFICATE";
fileMap.p10 = "CERTIFICATE";
fileMap.p12 = "CERTIFICATE";
fileMap.p7b = "CERTIFICATE";
fileMap.p7c = "CERTIFICATE";
fileMap.p7r = "CERTIFICATE";
fileMap.p8 = "CERTIFICATE";
fileMap.pem = "CERTIFICATE";
fileMap.pfx = "CERTIFICATE";
fileMap.spc = "CERTIFICATE";
fileMap.config = "CONFIG";
fileMap.csv = "CSV";
fileMap.xls = "EXCEL";
fileMap.xlsx = "EXCEL";
fileMap.swf = "FLASH";
fileMap.ftl = "FREEMARKER";
fileMap.gif = "GIFIMAGE";
fileMap.gz = "GZIP";
fileMap.htm = "HTMLDOC";
fileMap.html = "HTMLDOC";
fileMap.shtml = "HTMLDOC";
fileMap.ico = "ICON";
fileMap.icon = "ICON";
fileMap.js = "JAVASCRIPT";
fileMap.jpg = "JPGIMAGE";
fileMap.jpeg = "JPGIMAGE";
fileMap.json = "JSON";
fileMap.eml = "MESSAGERFC";
fileMap.mp3 = "MP3";
fileMap.mpg = fileMap.mpeg = "MPEGMOVIE";
fileMap.mpp = fileMap.mpt = "MSPROJECT";
fileMap.pdf = "PDF";
fileMap.pjpeg = "PJPGIMAGE";
fileMap.prn = fileMap.txt = fileMap.log = fileMap.htc = fileMap.sql = fileMap.ts = "PLAINTEXT";
fileMap.png = "PNGIMAGE";
fileMap.ps = fileMap.eps = "POSTSCRIPT";
fileMap.ppt = fileMap.pptx = "POWERPOINT";
fileMap.qt = fileMap.mov = "QUICKTIME";
fileMap.rtf = "RTF";
fileMap.scss = "SCSS";
fileMap.sms = "SMS";
fileMap.css = "STYLESHEET";
fileMap.svg = "SVG";
fileMap.tar = fileMap.tgz = fileMap.tbz = "TAR";
fileMap.tif = fileMap.tiff = "TIFFIMAGE";
fileMap.vsd = fileMap.vsdx = "VISIO";
fileMap.ssp = "WEBAPPPAGE";
fileMap.ss = "WEBAPPSCRIPT";
fileMap.doc = fileMap.docx = fileMap.dot = "WORD";
fileMap.xml = "XMLDOC";
fileMap.xsd = "XSD";
fileMap.zip = fileMap.lzh = fileMap.lha = "ZIP";
const IGNORE = ".h3ignore";
const CONFIG = path_1.resolve(__dirname, ".h3config");
const HISTORY = ".h3history";
function init() {
    console.log("enter suitelet url");
    const url = readline_sync_1.prompt();
    console.log("enter key");
    const key = readline_sync_1.prompt();
    fs_1.writeFileSync(CONFIG, JSON.stringify({ url, key }));
    fs_1.writeFileSync(IGNORE, ".git\n.gitignore\n.h3ignore\n.h3history\nnode_modules");
    fs_1.writeFileSync(HISTORY, "{}");
}
exports.init = init;
;
async function watch(file, parent) {
    console.log("watch started");
    while (true) {
        await sync(file, parent, false);
        await new Promise(r => setTimeout(r, 1000));
    }
}
exports.watch = watch;
;
async function sync(file = ".", parent = "-15", force = true) {
    const filePath = path_1.resolve(file);
    if (!fs_1.existsSync(CONFIG) && !fs_1.existsSync(IGNORE)) {
        console.log("run 'h3-sync init' first");
        return;
    }
    if (!fs_1.existsSync(filePath)) {
        console.log("file does not exists");
        return;
    }
    const history = JSON.parse(fs_1.readFileSync(HISTORY, { encoding: "utf-8" }));
    const config = JSON.parse(fs_1.readFileSync(CONFIG, { encoding: "utf-8" }));
    const url = config.url;
    const key = config.key;
    const obj = !force && history[parent] ? history[parent] : {};
    const ignore = fs_1.readFileSync(IGNORE, { encoding: "utf-8" }).split("\n").filter(file => file.trim()).map(file => path_1.resolve(file));
    await _sync(filePath, parent);
    history[parent] = obj;
    if (!force)
        fs_1.writeFileSync(HISTORY, JSON.stringify(history));
    async function _sync(filePath, parent) {
        if (ignore.includes(filePath))
            return { status: true };
        const stats = await promises_1.stat(filePath);
        const body = {
            name: path_1.basename(filePath),
            parent,
            key
        };
        if (stats.isDirectory()) {
            if (!obj[filePath]) {
                body.type = "folder";
                const result = await request(url, body);
                if (result.id) {
                    console.log(`${filePath} synced`);
                    obj[filePath] = result.id;
                }
                else {
                    return { status: false, value: filePath };
                }
            }
            let files = await promises_1.readdir(filePath);
            files = files.map(file => path_1.resolve(filePath, file));
            while (files.length > 0) {
                const results = await Promise.all(files.map(file => _sync(file, obj[filePath])));
                files = results.filter(result => !result.status).map(result => result.value);
                if (results.filter(result => result.status).length < 1) {
                    console.log(`unable to sync these files: ${files}`);
                    break;
                }
                ;
            }
        }
        else if (stats.isFile()) {
            if (obj[filePath] === String(stats.mtimeMs))
                return { status: true };
            body.type = "file";
            body.extension = fileMap[path_1.extname(filePath).substring(1).toLowerCase()] || "PLAINTEXT";
            if (["CERTIFICATE", "CONFIG", "CSV", "HTMLDOC", "JAVASCRIPT", "JSON", "PLAINTEXT", "SCSS", "STYLESHEET", "XMLDOC"].includes(body.extension)) {
                body.contents = await promises_1.readFile(filePath, { encoding: 'utf-8' });
            }
            else {
                body.contents = await promises_1.readFile(filePath, { encoding: 'base64' });
            }
            const result = await request(url, body);
            if (result.id) {
                console.log(`${filePath} synced`);
                obj[filePath] = String(stats.mtimeMs);
            }
            else {
                return { status: false, value: filePath };
            }
        }
        return { status: true };
    }
}
exports.sync = sync;
;
async function request(url, body) {
    try {
        const form = new form_data_1.default();
        form.append('body', JSON.stringify(body));
        const headers = Object.assign({ "User-Agent": "Mozilla/5.0" }, form.getHeaders());
        const result = await axios_1.default.post(url, form, { headers });
        return result.data;
    }
    catch (error) {
        return {};
    }
}
