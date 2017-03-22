var fs = require("fs")
var path = require("path")

function isFile(path) { return new Promise(function(resolve,reject){
	fs.stat(path, function(err, stat) {
		if(err){resolve(false)}
		if (stat && ! stat.isDirectory()) {
			resolve(true)
			} 
		else {
			resolve(false)
			}
		});
	})}

function getFullDirListRecursive(dir, callback) {  return new Promise(function(resolve,reject){
	function done(err,result){
		if (callback) {if (err) {callback(err,null)} else {callback(null,result)} }
		else          {if (err) {reject(err)}        else {resolve(result)       } }
		}
	var results = [];
	fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var pending = list.length;
		if (!pending) { return done(null, results);}
		list.forEach(function(file) {
			var filepath = path.resolve(dir, file);
			fs.stat(filepath, function(err, stat) {
				if (stat && stat.isDirectory()) {
					getFullDirListRecursive(filepath, function(err, res) {
                        if (err) { console.log("getFullDirListRecursive ERROR",err) }
						results = results.concat(res);
						if (!--pending) {done(null, results);return};
						});
					} 
				else {
					results.push([file,dir,stat.size.toString(),stat.ctime,stat.mtime]);
					if (!--pending) done(null, results);
					}
				});
		});
	});
})}

exports.isFile                  = isFile
exports.getFullDirListRecursive = getFullDirListRecursive