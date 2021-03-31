#!/usr/bin/env node

import axios from "axios";
import { readdir, stat, readFile } from 'fs/promises';
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename, extname } from "path";
import FormData from 'form-data';
import { prompt } from "readline-sync";
import { red } from "chalk";

const fileMap: Record<string, string> = {};
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

let history: any, ignore: any, url: string, key: string;

function cli() {
    try {
        ({ url, key } = JSON.parse(readFileSync(CONFIG, { encoding: "utf-8" })));
    } catch (error) {
        init();
    }

    const args = process.argv.slice(2);
    if (args[0] == "init") init();
    else if (args[0] == "watch") watch(args[1], args[2]);
    else console.log(`
        usage: 
        h3sync init
        h3sync watch
    `);
}

cli();


export async function init() {
    console.log("enter suitelet url");
    url = prompt();
    console.log("enter key");
    key = prompt();
    const result = await request({ type: "ping" });
    if (!result.status) throw Error("incorrect credentials");
    writeFileSync(CONFIG, JSON.stringify({ url, key }));
};

export async function watch(file = ".", parent = "-15") {
    try {
        history = JSON.parse(readFileSync(HISTORY, { encoding: "utf-8" }));
        ignore = readFileSync(IGNORE, { encoding: "utf-8" }).split("\n").filter(file => file.trim()).map(file => resolve(file));
    } catch (error) {
        writeFileSync(IGNORE, ".git\n.gitignore\n.h3ignore\n.h3history\nnode_modules");
        writeFileSync(HISTORY, "{}");
        watch(file, parent);
        return;
    }
    const filePath = resolve(file);
    if (!existsSync(filePath)) {
        console.log("file does not exists");
        return;
    }
    console.log("watch started");
    while (true) {
        await sync(filePath, parent, false);
        await new Promise(r => setTimeout(r, 100));
    }
};


export async function sync(filePath: string, parent: string, force: boolean) {

    let objChanged = false;
    const obj = !force && history[parent] ? history[parent] : { [filePath]: parent };

    await _sync(filePath, parent);
    history[parent] = obj;

    if (!force && objChanged) writeFileSync(HISTORY, JSON.stringify(history));

    async function _sync(filePath: string, parent: string) {
        if (ignore.includes(filePath)) return { status: true };
        const stats = await stat(filePath);
        const body: {
            name: string,
            parent: string,
            type?: string,
            extension?: string,
            contents?: string,
        } = {
            name: basename(filePath),
            parent,
        };
        if (stats.isDirectory()) {
            if (!obj[filePath]) {
                body.type = "folder";
                const result = await request(body);
                if (result.id) {
                    console.log(`${filePath} synced`);
                    obj[filePath] = result.id;
                    objChanged = true;
                } else {
                    return { status: false, filePath, error: result.error, isDir: true };
                }
            }
            let files = await readdir(filePath);
            files = files.map(file => resolve(filePath, file));

            while (files.length) {
                const results = await Promise.all(files.map(file => _sync(file, obj[filePath])));
                const passed = results.filter(({ status }) => status);
                if (passed.length)
                    files = results.filter(({ status }) => !status).map(({ filePath }) => filePath as string);

                else {
                    results.map(({ filePath, error, isDir, mtimeMs }) => {
                        console.log(red(`unable to sync: ${filePath}`));
                        error && console.log(red(error));

                        if (mtimeMs) {
                            objChanged = true;
                            obj[filePath as string] = mtimeMs;
                        } else if (isDir) {
                            ignore.push(filePath as string);
                        }
                    });
                    break;
                }

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
            const result = await request(body);
            if (result.id) {
                obj[filePath] = String(stats.mtimeMs);
                objChanged = true;
                console.log(`${filePath} synced`);
            } else {
                return { status: false, filePath, error: result.error, mtimeMs: String(stats.mtimeMs) };
            }
        }
        return { status: true };
    }
};

async function request(body: any) {
    try {
        const form = new FormData();
        form.append('body', JSON.stringify({ ...body, key }));
        const headers = Object.assign({ "User-Agent": "Mozilla/5.0" }, form.getHeaders());
        const result = await axios.post(url, form, { headers });
        return result.data;
    } catch (error) {
        return {};
    }
}
