let axios = require("axios");
let fs = require('fs/promises');
let fsSync = require("fs");
let path = require("path");
let FormData = require('form-data');
let cwait = require("cwait");
let TaskQueue = cwait.TaskQueue;

let fileMap = {};
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

let queue = new TaskQueue(Promise, 40);

let IGNORE = ".syncignore";
let CONFIG = ".sync";
let URL = "";

function cli() {
    let args = process.argv.slice(2);
    if (args[0] == "init") init(args[1] || "");
    else if (args[0] == "sync") sync(args[1] || ".", args[2] || "-15");
    else help();
}

cli();

function init(url) {
    if (url) fsSync.writeFileSync(CONFIG, JSON.stringify({ URL: url }));
    else help();
}

function help() {
    console.log("help");
}

async function sync(file, parent) {
    let filePath = path.resolve(__dirname, file);
    if (!fsSync.existsSync(CONFIG) || !fsSync.existsSync(filePath)) {
        help();
        return;
    }
    let obj = JSON.parse(fsSync.readFileSync(CONFIG));
    URL = obj.URL;
    let ignore = [];
    if (fsSync.existsSync(IGNORE)) fsSync.readFileSync(IGNORE, { encoding: "utf-8" }).split("\n").map(line => line ? ignore.push(path.resolve(__dirname, line)) : line);
    console.log(ignore);
    await _sync(filePath, parent);
    fsSync.writeFileSync(CONFIG, JSON.stringify(obj));

    // helper
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
                let result = await request(URL, body);
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
            let result = await request(URL, body);
            if (result.id) {
                console.log(`${filePath} synced`);
                obj[filePath] = stats.mtimeMs;
            } else {
                console.log(`unable to sync ${filePath}`);
            }
        }
    }
}

async function request(url, body) {
    try {
        let form = new FormData();
        form.append('body', JSON.stringify(body));
        let headers = Object.assign({ "User-Agent": "Mozilla/5.0" }, form.getHeaders());
        let result = await axios.post(url, form, { headers });
        return result.data;
    } catch (error) {
        console.log(error);
    }
}