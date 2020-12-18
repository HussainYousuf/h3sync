import axios from "axios";
import { readdir, stat, readFile } from 'fs/promises';
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename, extname } from "path";
import FormData from 'form-data';
import { prompt } from "readline-sync";

const fileMap: { [key: string]: string; } = {};
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
const CONFIG = resolve(__dirname, ".h3config");
const HISTORY = ".h3history";
const onWatchIgnore: string[] = [];

export function init() {
    console.log("enter suitelet url");
    const url = prompt();
    console.log("enter key");
    const key = prompt();
    writeFileSync(CONFIG, JSON.stringify({ url, key }));
    writeFileSync(IGNORE, ".git\n.gitignore\n.h3ignore\n.h3history\nnode_modules");
    writeFileSync(HISTORY, "{}");
};

export async function watch(file: string, parent: string) {
    console.log("watch started");
    while (true) {
        await sync(file, parent, false);
        await new Promise(r => setTimeout(r, 1000));
    }
};

export async function sync(file = ".", parent = "-15", force = true) {
    const filePath = resolve(file);
    if (!existsSync(CONFIG) && !existsSync(IGNORE)) {
        console.log("run 'h3-sync init' first");
        return;
    }
    if (!existsSync(filePath)) {
        console.log("file does not exists");
        return;
    }

    const history = JSON.parse(readFileSync(HISTORY, { encoding: "utf-8" }));
    const config: { url: string, key: string; } = JSON.parse(readFileSync(CONFIG, { encoding: "utf-8" }));
    const url = config.url;
    const key = config.key;

    const obj = !force && history[parent] ? history[parent] : {};
    const ignore = [...readFileSync(IGNORE, { encoding: "utf-8" }).split("\n").filter(file => file.trim()).map(file => resolve(file)), ...onWatchIgnore];

    await _sync(filePath, parent);
    history[parent] = obj;
    if (!force) writeFileSync(HISTORY, JSON.stringify(history));

    async function _sync(filePath: string, parent: string) {
        if (ignore.includes(filePath)) return { status: true };
        const stats = await stat(filePath);
        const body: {
            name: string,
            parent: string,
            type?: string,
            extension?: string,
            contents?: string,
            key: string;
        } = {
            name: basename(filePath),
            parent,
            key
        };
        if (stats.isDirectory()) {
            if (!obj[filePath]) {
                body.type = "folder";
                const result: { id: string; } = await request(url, body);
                if (result.id) {
                    console.log(`${filePath} synced`);
                    obj[filePath] = result.id;
                } else {
                    return { status: false, value: filePath };
                }
            }
            let files = await readdir(filePath);
            files = files.map(file => resolve(filePath, file));
            while (files.length > 0) {
                const results = await Promise.all(files.map(file => _sync(file, obj[filePath])));
                files = results.filter(result => !result.status).map(result => result.value as string);
                if (results.filter(result => result.status).length < 1) {
                    console.log(`unable to sync these files: ${files}`);
                    onWatchIgnore.push(...files);
                    break;
                };
            }

        } else if (stats.isFile()) {
            if (obj[filePath] === String(stats.mtimeMs)) return { status: true };
            body.type = "file";
            body.extension = fileMap[extname(filePath).substring(1).toLowerCase()] || "PLAINTEXT";
            if (["CERTIFICATE", "CONFIG", "CSV", "HTMLDOC", "JAVASCRIPT", "JSON", "PLAINTEXT", "SCSS", "STYLESHEET", "XMLDOC"].includes(body.extension)) {
                body.contents = await readFile(filePath, { encoding: 'utf-8' });
            }
            else {
                body.contents = await readFile(filePath, { encoding: 'base64' });
            }
            const result: { id: string; } = await request(url, body);
            if (result.id) {
                console.log(`${filePath} synced`);
                obj[filePath] = String(stats.mtimeMs);
            } else {
                return { status: false, value: filePath };
            }
        }
        return { status: true };
    }
};

async function request(url: string, body: any) {
    try {
        const form = new FormData();
        form.append('body', JSON.stringify(body));
        const headers = Object.assign({ "User-Agent": "Mozilla/5.0" }, form.getHeaders());
        const result = await axios.post(url, form, { headers });
        return result.data;
    } catch (error) {
        return {};
    }
}
