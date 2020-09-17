let axios = require("axios");
let fs = require('fs/promises');
let path = require("path");
let FormData = require('form-data');

let args = process.argv.slice(2);

let filePath = args[0];
let folderId = args[1] || "-15";

syncFile(path.resolve(__dirname, filePath), folderId);

async function syncFile(filePath, folderId) {
    try {
        let stats = await fs.stat(filePath);
        let fileName = path.basename(filePath);
        let body = {
            fileName,
            folderId,
        };

        if (stats.isFile()) {
            body.type = "file";
            body.extension = path.extname(filePath) || ".txt";
            body.extension = fileMap[body.extension.substring(1).toLowerCase()] || "PLAINTEXT";
            if (["CERTIFICATE", "CONFIG", "CSV", "HTMLDOC", "JAVASCRIPT", "JSON", "PLAINTEXT", "SCSS", "STYLESHEET", "XMLDOC"].includes(body.extension))
                body.contents = await fs.readFile(filePath, { encoding: 'utf-8' });
            else
                body.contents = await fs.readFile(filePath, { encoding: 'base64' });
            let result = await request("https://tstdrv1796095.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1002&deploy=1&compid=TSTDRV1796095&h=3c0a9cc1d54b2f3df341", body);
            if (result.id) {
                console.log(fileName + " synced in folder whose id is: " + folderId);
            }
        } else if (stats.isDirectory()) {
            body.type = "folder";
            let result = await request("https://tstdrv1796095.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1002&deploy=1&compid=TSTDRV1796095&h=3c0a9cc1d54b2f3df341", body);
            if (result.id) {
                console.log(fileName + " has folder id: " + result.id);
                let files = await fs.readdir(filePath);
                for (let file of files) syncFile(path.resolve(filePath, file), result.id);
            }
        }

    } catch (error) {
        console.log(error);
        if (body) console.log(body.fileName + " failed to sync");
    }
}

async function request(url, body) {
    let form = new FormData();
    form.append('body', JSON.stringify(body));
    let headers = Object.assign({ "User-Agent": "Mozilla/5.0" }, form.getHeaders());
    let result = await axios.post(url, form, { headers });
    return result.data;
}

var fileMap = {};
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


