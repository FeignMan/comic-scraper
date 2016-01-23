var async = require("async");
var cheerio = require("cheerio");
var fs = require("fs");
var request = require("request");
var download = require("./download.js");
var assert = require("assert");
var util = require("util");
var logger = require("bunyan").createLogger({name: "scraper"});

/* ToDo:
*/

var testHtml = "hellocomic.html";
var comicUrl = "http://hellocomic.com/injustice-gods-among-us-year-two/c1/p1";
if (process.argv.length > 2) comicUrl = process.argv[2];

function printSampleHTML() {
	var testHtml = fs.readFileSync(testHtml, {flag: "r"});
	console.log(testHtml.toString());
}

function getHtml(url, callback) {
	request(url, function(err, resp, body) {
		if (err)
			return callback("getHtml: " + err);

		if (resp.statusCode !== 200)
			return callback("getHtml: " + "HTTP Error: " + resp.statusCode);

	//	console.log("Debug: Received HTML:", url);
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
		//	Get URLs for other all pages
		function (info, callback) {
			var urlPrefix = params.inputUrl.slice(0, params.inputUrl.lastIndexOf("/") + 2);
			info.issueUrls = {};
			for (var i = 0; i < $("select").length; i++ ) {
				var current = $("select")[i];
				if ($(current).attr("id") && $(current).attr("id") === "e1") {
					var children = $(current).children("option");
					for (var j = 0; j < children.length; j++)
						info.issueUrls["p" + (j+1).toString()] = (urlPrefix + $(children[j]).text());
				}
			}
			return callback(null, info);
		},
		//	Get URLs for other all issues and info.name of the current issue
		function (info, callback) {
			info.seriesUrls = {};
			var urlPrefix = params.inputUrl.slice(0, params.inputUrl.lastIndexOf("/") + 2);
			for (var i = 0; i < $("select").length; i++ ) {
				var current = $("select")[i];
				if ($(current).attr("id") && $(current).attr("id") === "e2") {
					var children = $(current).children("option");
					for (var j = 0; j < children.length; j++) {
						var name = $(children[j]).text().trim();
						var url = $(children[j]).attr("value");
						info.seriesUrls[name] = url;
						if ($(children[j]).attr("value").indexOf(urlPrefix) > -1)
							info.issueName = name;
					}
				}
			}
			return callback(null, info);
		}
	], function(err, info) {
		return callback(null, info);
	});
}

function setupOutDir(info, callback) {
	var dirPath = "./output/" + info.issueName;
	info.outPath = dirPath + "/";
	fs.readdir(dirPath, function(err, files){
		if (err) {
			logger.info("Creating folder:", dirPath);
			fs.mkdirSync(dirPath);
		}
		logger.info("Info: Output directory setup complete\n");
		callback(null, info);
	});
}

function downloadComicPage(url, filePath, callback) {
	getHtml(url, function(err, html) {
		if (err) return callback(err);

		var $ = cheerio.load(html);
		var coverIssue = $("div.coverIssue")[0];
		imageUrl = $(coverIssue).children("a").children("img").attr("src");

		download({ 
				url: imageUrl,
				path: filePath,
				checkIfExists: true
			}, function(err, result) {
				if (err) return callback("Download Error: " + err);
				return callback(null);
			});
	});
}

function downloadIssue(url, callback) {
	getHtml(url, function(err, html) {
		if (err) return callback(err);
		var info;
		async.waterfall([
			//	Get comic info
			async.apply(getInfo, { html: html, inputUrl: url }),
			
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
						logger.info("Downloading:", info.issueName, ", Page -", curr);
						
						downloadComicPage(info.issueUrls[curr], path, function(err) {
							if (err) return callback("Download failed: " + curr + " - " + err);

							logger.info("File completed -", curr);
							return callback(null, curr);
						});
					};
				}),
				function(err, results) {
					if (err) return callback(err);
					logger.info("Completed downloading issue:", info.issueName);
					return callback(null, info);
				});
			}
		], callback);
	});
}

function downloadSeries(url, callback) {
	getHtml(url, function(err, html) {
		if (err) return callback(err);

		getInfo({ html: html, inputUrl: url }, function(err, info) {
			logger.info("Url entered for issue:", info.issueName);
			logger.info("Issues found for this series:\n", Object.keys(info.seriesUrls));
			
			async.series(Object.keys(info.seriesUrls).map(function(curr) {
				
				return function(callback) {

					logger.info("\nDownloading Issue:", curr);
					downloadIssue(info.seriesUrls[curr], function(err, info) {
						if(err) {
							logger.error("Error:", err);
							logger.info("Skipping", curr);
							return callback(null, {
								name: curr,
								downloadStatus: false
							});
						}
						return callback(null, {
								name: curr,
								downloadStatus: true
							});
					});
				};
			}),
			function(err, downloadResults) {
				assert(!err, "An error should never reach here");
				return callback(null, downloadResults);
			});
		});
	});
}

//	Main
if (!module.parent) {

	var downloadMode = "issue";
	if (process.argv.length > 3) downloadMode = process.argv[3];

	switch (downloadMode) {
		case "series":
			downloadSeries(comicUrl, function(err, completedIssues) {
				if (!err) {
					var result = "Series downloaded Successfully!";
					logger.info("Issues successfully downloaded:\n", 
						completedIssues.forEach(function(curr) {
							if (curr.downloadStatus) logger.info(curr.name, "Downloaded successfully!");
							else {
								logger.error(curr.name, "FAILED or INCOMPLETE!");
								result = "One or more issues might be incomplete or missing!";
							}
					}));
					logger.info(result);
				}
				else
					logger.error("Error:", err);
			});
			break;
		case "issue":
			downloadIssue(comicUrl, function(err, info) {
				if (!err) {
					logger.info("\nAlso available in this series...");
					Object.keys(info.seriesUrls).forEach(function (issue) {
						console.log(issue);
					});
				}
				else
					logger.error("Error:", err);
			});
			break;
		case "dev":
			var path = "./output/Darth Vader - #01/p1.jpg";
			var stat = null;
			if (fs.existsSync(path))
				stat = fs.statSync(path);
			console.log(stat);
			console.log("File Size:", stat ? stat.size: null);
			break;
	}
}