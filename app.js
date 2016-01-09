var async = require("async");
var fs = require("fs");
var request = require("request");

var filePath = "./pages/page03.jpg";
var url = "http://hellocomic.com/img/magazines/injustice-gods-among-us-year-two/injustice-gods-among-us-year-two-18/Injustice-%20Gods%20Among%20Us%20-%20Year%20Two%20(2014-)%20018-003.jpg";
var googleUrl = "https://www.google.com/images/srpr/logo3w.png";

// fs.readdir("./pages", function (err) {
// 	if (err) fs.mkdirSync("./pages");
// });
var fileStream;
async.waterfall([
	//Make the HEAD request
	function(callback) {
		console.log("Making the HEAD request...");
		request.head(url, function(err, res, body) {
			if (err) return callback("HEAD Request Error: " + err);
			console.log("Headers:", res.headers);
			return callback(null);
		});
	},
	//	Create file stream
	function(callback) {
		fileStream = fs.createWriteStream(filePath, {
			flags: "w+"
		});
		return callback(null, fileStream);
	},
	//	Make the GET request
	function(fileStream, callback) {
		console.log("\nMaking the GET request...");
		var req = request.get(url);
		req.on("response", function(response) {
			if (response.statusCode === 200) {
				console.log("GET Headers:", response.headers);
				// req.pipe(fileStream);
			}
		});
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
], function (err, result) {
	if (err) return console.log("Err:", err);

	console.log("\nWaterfall over. Result -", result);
});