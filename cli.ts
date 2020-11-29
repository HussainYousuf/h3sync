#!/usr/bin/env node

let { init, sync, watch } = require("./app");

function cli() {
    let args = process.argv.slice(2);
    if (args[0] == "init") init();
    else if (args[0] == "watch") watch(args[1], args[2]);
    else if (args[0] == "sync") sync(args[1], args[2], args[3]);
    else console.log("invalid usage");
}

cli();