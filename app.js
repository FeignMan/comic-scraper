var async = require("async");
var fs = require("fs");
var request = require("request");
var download = require("./download.js");

/* ToDo:
- Add html parsing to support hellocomic.com
- 
*/

var filePath = "./pages/page03.jpg";
var url = "http://hellocomic.com/img/magazines/injustice-gods-among-us-year-two/injustice-gods-among-us-year-two-18/Injustice-%20Gods%20Among%20Us%20-%20Year%20Two%20(2014-)%20018-003.jpg";
var testUrl = "https://www.google.com/images/srpr/logo3w.png";

function getAPage() {
 	var comicUrl = "http://hellocomic.com/injustice-gods-among-us-year-two/c18/p1";
	request(comicUrl, function(err, resp, body) {
		if (err)
			return console.log("Could not reach hellocomic.com -", err);

		if (resp.statusCode !== 200)
			return console.log("HTTP Error:", response.statusCode);

		fs.writeFileSync("HTML.html", body, { flag: "w+"});
		console.log("getAPage successful!");
	});
}

function printSampleHTML() {
	var testHtml = fs.readFileSync("HTML.html", {flag: "r"});
	console.log(testHtml.toString());
}

download({ url: url, path: filePath	}, function(err, result) {
	console.log("\nDownload", result);
});