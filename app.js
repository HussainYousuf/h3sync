const axios = require("axios");
const fs = require('fs/promises');
const fsSync = require("fs");
const path = require("path");
const FormData = require('form-data');
const cwait = require("cwait");
const input = require("readline-sync");
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

const queue = new cwait.TaskQueue(Promise, 40);

const IGNORE = ".f3ignore";
const CONFIG = path.resolve(__dirname, ".config");

exports.init = function () {
    console.log("enter suitelet url");
    fsSync.writeFileSync(CONFIG, JSON.stringify({ url: input.prompt() }));
    fsSync.writeFileSync(IGNORE, ".git\n.gitignore\n.f3ignore\nnode_modules");
};

exports.watch = async function (file, parent) {
    while (true) {
        await sync(file, parent, false);
        await new Promise(r => setTimeout(r, 1000));
    }
};

exports.sync = sync;
async function sync(file = ".", parent = "-15", force = true) {
    let filePath = path.resolve(file);
    if (!fsSync.existsSync(CONFIG)) {
        console.log("run 'f3sync init' first");
        return;
    }
    if (!fsSync.existsSync(filePath)) {
        console.log("file does not exists");
        return;
    }
    let config = JSON.parse(fsSync.readFileSync(CONFIG));
    let obj = {};
    if (!force && config[parent]) obj = config[parent];
    let ignore = [];
    if (fsSync.existsSync(IGNORE)) ignore = fsSync.readFileSync(IGNORE, { encoding: "utf-8" }).split("\n");
    ignore = ignore.filter(file => file.trim());
    ignore = ignore.map(file => path.resolve(file));
    await _sync(filePath, parent);
    config[parent] = obj;
    if (!force) fsSync.writeFileSync(CONFIG, JSON.stringify(config));

    async function _sync(filePath, parent) {
        if (ignore.includes(filePath)) return;
        let stats = await fs.stat(filePath);
        let body = {
            name: path.basename(filePath),
            parent
        };
        if (stats.isDirectory()) {
            if (!obj[filePath]) {
                body.type = "folder";
                let result = await request(config.url, body);
                if (result.id) {
                    console.log(`${filePath} synced`);
                    obj[filePath] = result.id;
                } else {
                    console.log(`unable to sync ${filePath}`);
                    return;
                }
            }
            let files = await fs.readdir(filePath);
            let promises = [];
            files.map(file => promises.push(file));
            await Promise.all(promises.map(queue.wrap(file => _sync(path.resolve(filePath, file), obj[filePath]))));
        } else if (stats.isFile()) {
            if (obj[filePath] === stats.mtimeMs) return;
            body.type = "file";
            body.extension = fileMap[path.extname(filePath).substring(1).toLowerCase()] || "PLAINTEXT";
            if (["CERTIFICATE", "CONFIG", "CSV", "HTMLDOC", "JAVASCRIPT", "JSON", "PLAINTEXT", "SCSS", "STYLESHEET", "XMLDOC"].includes(body.extension)) {
                body.contents = await fs.readFile(filePath, { encoding: 'utf-8' });
            }
            else {
                body.contents = await fs.readFile(filePath, { encoding: 'base64' });
            }
            let result = await request(config.url, body);
            if (result.id) {
                console.log(`${filePath} synced`);
                obj[filePath] = stats.mtimeMs;
            } else {
                console.log(`unable to sync ${filePath}`);
            }
        }
    }
};

async function request(url, body) {
    try {
        console.log("sync in progress...");
        let form = new FormData();
        form.append('body', JSON.stringify(body));
        let headers = Object.assign({ "User-Agent": "Mozilla/5.0" }, form.getHeaders());
        let result = await axios.post(url, form, { headers });
        return result.data;
    } catch (error) {
        return {};
    }
}