var async = require("async");
var fs = require("fs");
var request = require("request");
var testUrl = "https://www.google.com/images/srpr/logo3w.png";

/*
	download({ url: url, path: filePath	}, function(err, result) {
		console.log("\nDownload", result);
	});
*/

module.exports = function (options, callback) {
	var ext;
	async.waterfall([
		//Make the HEAD request
		function(callback) {
			request.head(options.url, function(err, res, body) {
				if (err) return callback("HEAD Request Error: " + err);
				switch (res.headers["content-type"]) {
					case "image/jpeg": ext = ".jpg"; break;
					case "image/png": ext = ".png"; break;
				}
				console.log("\n\nContect-Length -", res.headers["content-length"]);
				return callback(null);
			});
		},
		//	Create file stream
		function(callback) {
			var fileStream = fs.createWriteStream(options.path + ext, {
				flags: "w+"
			});
			return callback(null, fileStream);
		},
		//	Make the GET request
		function(fileStream, callback) {
			console.log("Downloading", options.url);
			var req = request.get(options.url);
			req.on("error", function(err) {
				fileStream.end();
				return callback("GET Error:" + err);
			});
			req.on("end", function() {
				fileStream.end( );
				return callback(null, "Success!");
			});
			req.pipe(fileStream);
		}
	], callback);
};