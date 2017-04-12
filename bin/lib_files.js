var fs = require("fs")
var path = require("path")
var removedir = require("rmdir")

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

function readFile(path) { return new Promise(function(resolve,reject){
	fs.readFile(path, function(err, buffer) {
		if(err){resolve(err)}
		else{
			resolve(buffer)
			} 
		});
	})}
function writeFile(path,buffer) { return new Promise(function(resolve,reject){
	fs.writeFile(path,buffer, function(err) {
		if(err){resolve(err)}
		else{
			resolve(true)
			} 
		});
	})}

function stat(path) { return new Promise(function(resolve,reject){
	fs.stat(path, function(err, stat) {
		if(err){
			reject(err)
		}
		else{
			resolve(stat)
		} 
	});
})}

function unlink(path) { return new Promise(function(resolve,reject){
	fs.unlink(path, function(err, stat) {
		if(err){reject(err)}
		else {
			resolve(true)
			}
		});
	})}

function rename(fromPath,toPath) { return new Promise(function(resolve,reject){
	fs.rename(fromPath,toPath, function(err, stat) {
		if(err){reject(err)}
		else {
			resolve(true)
			}
		});
	})}
function copy(fromPath, toPath) { return new Promise(function(resolve,reject){
	fs.stat(fromPath,(err,stat)=>{
		if(err){reject(err)}
		var stream = fs.createReadStream(fromPath).pipe(fs.createWriteStream(toPath));
		stream.on('finish', function () {
			fs.utimes(toPath, stat.atime, stat.mtime,(err)=>{
				if(err){reject(err)}
				resolve(true)
			})
		});
	});
	
})}

function rmdir(path) { return new Promise(function(resolve,reject){
	removedir(path, function(err) {
		if(err){reject(err)}
		else {
			resolve(true)
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
				if (err) { 
					console.log("getFullDirListRecursive ERROR",err)
				}
				else{
					if (stat && stat.isDirectory()) {
						getFullDirListRecursive(filepath, function(err, res) {
							if (err) {
								console.log("getFullDirListRecursive ERROR",err) 
							}
							results = results.concat(res);
							if (!--pending) {
								done(null, results);return
							};
						});
					} 
					else {
						results.push([file,dir, stat ? stat.size.toString() : 0 , stat ? stat.ctime : 0 , stat ? stat.mtime :0 ]);
						if (!--pending) {
							done(null, results)
						};
					}
				}
			});
		});
	});
})}

exports.isFile                  = isFile
exports.readFile                  = readFile
exports.writeFile                  = writeFile
exports.stat                  = stat
exports.unlink                  = unlink
exports.copy                  = copy
exports.rename                  = rename
exports.rmdir                  = rmdir
exports.getFullDirListRecursive = getFullDirListRecursive