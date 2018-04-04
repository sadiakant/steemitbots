var fs = require("fs");

var d = new Date();
var message = "1234567890"
var fileName = "" +
    d.getFullYear() + "-" +
    pad(d.getMonth(), 2) + "-" +
    pad(d.getDay(), 2) + ".log"; 

fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");
fs.appendFileSync(fileName, message + "\n");

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}