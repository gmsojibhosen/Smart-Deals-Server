// encode.js
import { readFileSync } from "fs";
const key = readFileSync("./smart-deals-sojib-firebase-admin.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
console.log(base64);