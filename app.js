var async = require("async");
var cheerio = require("cheerio");
var fs = require("fs");
var request = require("request");
var download = require("./download.js");

/* ToDo:
- Command Line url input
- Support to download whole comic series
*/

var testPath = "./pages/page03.jpg";
var comicUrl = "http://hellocomic.com/injustice-gods-among-us-year-two/c18/p17";

function printSampleHTML() {
	var testHtml = fs.readFileSync("HTML.html", {flag: "r"});
	console.log(testHtml.toString());
}

function getHtml(url, callback) {
	request(url, function(err, resp, body) {
		if (err)
			return callback("getHtml: " + err);

		if (resp.statusCode !== 200)
			return callback("getHtml: " + "HTTP Error: " + resp.statusCode);

		callback(null, body.toString());
	});
}

function getInfo(params, callback) {
	var info = {};
	var $ = cheerio.load(params.html);
	
	async.waterfall([
		// 	Get Description
		function (callback) {
			for (var i = 0; i < $("meta").length; i++ ) {
				var current = $("meta")[i];
				if ($(current).attr("name") && $(current).attr("name") === "description" && $(current).attr("content")) {
					info.desc = $(current).attr("content");
					return callback(null, info);
				}
			}
		},
		//	Get Name
		function (info, callback) {
			var coverIssue = $("div.coverIssue")[0];
			info.name = $(coverIssue).children("a").children("img").attr("alt");
			callback(null, info);
		},
		//	Get URLs for other all issues
		function (info, callback) {
			var urlPrefix = params.inputUrl.slice(0, params.inputUrl.lastIndexOf("/") + 2);
			info.issueUrls = {};
			for (var i = 0; i < $("select").length; i++ ) {
				var current = $("select")[i];
				if ($(current).attr("id") && $(current).attr("id") === "e3") {
					var children = $(current).children("option");
					for (var j = 0; j < children.length; j++)
						info.issueUrls["p" + (j+1).toString()] = (urlPrefix + $(children[j]).text());
				}
			}
			return callback(null, info);
		},
		//	Get URLs for other all issues
		function (info, callback) {
			var urlPrefix = params.inputUrl.slice(0, params.inputUrl.lastIndexOf("/") + 2);
			info.issueUrls = {};
			for (var i = 0; i < $("select").length; i++ ) {
				var current = $("select")[i];
				if ($(current).attr("id") && $(current).attr("id") === "e3") {
					var children = $(current).children("option");
					for (var j = 0; j < children.length; j++)
						info.issueUrls["p" + (j+1).toString()] = (urlPrefix + $(children[j]).text());
				}
			}
			return callback(null, info);
		}
	], function(err, info) {
		return callback(null, info);
	});
}

function setupOutDir(info, callback) {
	var dirPath = "./output/" + info.name;
	info.outPath = dirPath + "/";
	fs.readdir(dirPath, function(err, files){
		if (err) {
			console.log("Warning: setupOutDir: " + err);
			fs.mkdirSync(dirPath);
		}
		console.log("Info: Output directory setup complete");
		callback(null, info);
	});
}

function downloadComicPage(url, filePath, callback) {
	getHtml(url, function(err, html) {
		if (err) return callback(err);

		var $ = cheerio.load(html);
		var coverIssue = $("div.coverIssue")[0];
		imageUrl = $(coverIssue).children("a").children("img").attr("src");

		download({ url: imageUrl, path: filePath	}, function(err, result) {
			if (err) return callback("Download Error: " + err);
			return callback(null);
		});
	});
}



//	Main
if (!module.parent) {

	getHtml(comicUrl, function(err, html) {
		console.log("Received HTML");
		if (err) return console.log(err);
		var info;
		async.waterfall([
			//	Get comic info
			async.apply(getInfo, { html: html, inputUrl: comicUrl }),
			
			//	Save info globally
			function (_info, callback) {
				info = _info;
				callback(null, info);
			},
			
			//	Create output directory
			setupOutDir,
			
			//	Download all issue pages
			function (info, callback) {
				async.series(Object.keys(info.issueUrls).map(function(curr) {
					return function(callback) {
						var path = info.outPath + curr;
						downloadComicPage(info.issueUrls[curr], path, function(err) {
							if (err) return callback("Download failed: " + curr + " - " + err);
							console.log("Download completed -", curr);
							return callback(null, curr);
						});
					};
				}),
				function(err, results) {
					if (err) return callback(err);
					return callback(null);
				});
			}
		], function (err, result) {
			if (err) return console.log(err);
			console.log("Waterfall complete");
		});
	});
}


