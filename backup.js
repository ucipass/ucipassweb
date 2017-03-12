#!node
var fs = require('fs');
var archiver = require('archiver');
var client = require('scp2');
var read = require('read')

var dt = new Date()
var dtStr = dt.getFullYear()+ "-" + (dt.getMonth()+1) + "-" + dt.getDate() + "_" + dt.getHours()  + "-" + dt.getMinutes() + "-" + dt.getSeconds() + "." + dt.getMilliseconds()
var backupFileName = __dirname + '/express_'+ dtStr+'.zip'

function scpUpload(){
	read({ prompt: 'Hostname: ' }, function(er, hostname) {
		read({ prompt: 'Username: ' }, function(er, username) {
			read({ prompt: 'Password: ', silent: true }, function(er, password) {
				var sshstr = username+':'+password+'@'+hostname+':22:.'
				var dt = new Date()
				var dtStr = dt.getFullYear()+ "-" + (dt.getMonth()+1) + "-" + dt.getDate() + "_" + dt.getHours()  + "-" + dt.getMinutes() + "-" + dt.getSeconds() + "." + dt.getMilliseconds()
				client.scp(backupFileName, sshstr, function(err) {
					if(err){console.log("SCP Error:",err);return;}
					console.log("ZIP uploaded...");
					fs.unlink(backupFileName,function(){console.log("ZIP temp file deleted..")})
					});
				});
			});
		});
	}

var output = fs.createWriteStream(backupFileName);
output.on('close',
	function() {
        	console.log('ZIP created...');
		scpUpload();
	});

var archive = archiver('zip');
archive.on('error', function(err) {
	throw err;
	});
archive.pipe(output);
archive.append(
	fs.createReadStream(__dirname + '/app.js'), 
	{name: 'app.js'}
	);
archive.append(
	fs.createReadStream(__dirname + '/backup.js'), 
	{name: 'backup.js'}
	);
archive.append(
	fs.createReadStream(__dirname + '/package.json'), 
	{name: 'package.json'}
	);
archive.bulk([
	{expand: true , cwd: './gallery' , src: ['**'] , dest: 'gallery/'},
	{expand: true , cwd: './bin' , src: ['**'] , dest: 'bin/'},
	{expand: true , cwd: './public',src: ['**'], dest: 'public/'},
	{expand: true,  cwd: './views', src: ['**'], dest: 'views/'},
	{expand: true,  cwd: './db', src: ['**'], dest: 'db/'}
	]);
archive.finalize();

