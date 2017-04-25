var path = require('path')
var fs = require('fs')
var crypto = require('crypto');
var geolib = require('geolib');
var moment = require('moment');
var piexif = require("piexifjs");
var express = require('express');
var File = require("ucipass-file")
var Directory = require("ucipass-directory")

var sql = require('./lib/lib_sqlite.js')
var JPG = require('./jpg.js')
var JSONData = require('./lib/jsondata.js');

var logger = require('winston');
logger.emitErrs = true;
logger.loggers.add('GALLERYDB', { console: { level: 'debug', label: "GALLERYDB", handleExceptions: true, json: false, colorize: true}});
var log = logger.loggers.get('GALLERYDB');

class GalleryDB {
	constructor(galleryDir,dbname){
		this.galleryDir		=	path.normalize(path.resolve(galleryDir))
		this.dbname 		= 	path.normalize(path.resolve(dbname))
		this.filelist		=	null
		this.allowedFns		= ["getselect2","getimages"]	// functions allowed to be called via ioData remotely
	}
	async init(){
		var db = new File(this.dbname)
		if ( await db.isFile() ) {
			log.info("Database file:", this.dbname )
			return this
		}
		var json = {dbname:this.dbname}
		await Promise.resolve(json)
		.then(function(json){ log.info("Database File NOT found creating new one!",json.dbname) ; return json})
		.then(sql.open(json))
		.then(sql.stm("CREATE TABLE IF NOT EXISTS files (\
			fpath NOT NULL,\
			hash NOT NULL,\
			size NOT NULL,\
			ctime DATETIME NOT NULL,\
			mtime DATETIME NOT NULL,\
			active BOOLEAN NOT NULL,\
			PRIMARY KEY (fpath)) "))
		.then(sql.write)
		.then(sql.stm("CREATE TABLE IF NOT EXISTS images (\
			hash NOT NULL,\
			idate DATETIME,\
			event, desc,\
			location, cc,\
			people,\
			rating INTEGER,\
			att,\
			PRIMARY KEY (hash)) "))
		.then(sql.write)
		.then(sql.stm("CREATE TABLE IF NOT EXISTS locations (lat  REAL NOT NULL ,lon  REAL NOT NULL , location, cc) "))
		.then(sql.write)
		.then(sql.stm("CREATE TABLE IF NOT EXISTS thumbs (hash NOT NULL,thumb BLOB NOT NULL, PRIMARY KEY (hash)) "))
		.then(sql.write)
		.then(sql.loadCSV(  path.join( path.dirname(json.dbname),"locations.csv") ,"locations"))
		.then(sql.loadCSV(  path.join( path.dirname(json.dbname),"countries.csv") ,"countries"))
		.then(function(json){ log.info("Created tables: files,images,thumbs,locations,countries.",json.dbname) ; return json})
		return this;
	}
	async getNewFiles(){
		var dbname = this.dbname;
		var dir = new Directory(this.galleryDir)
		var filesColumns = ["fpath","hash","size","ctime","mtime","active"]
		
		//Get all files and Sql files data
		var dirFilesRaw = await dir.filelist()
		var sqlFilesRaw = (await sql.sReadTable(dbname,"files")).table
		
		var dirFiles = new Map()	// Map obj. to store keyed directory files to eliminate duplicates
		dirFilesRaw.forEach((file,index)=>{
			dirFiles.set(   path.relative(this.galleryDir, file.fpath)   +file.size.toString()+file.mtime.toISOString(),file)
		})
		var sqlFiles = new Map()	// Map obj. to store keyed sql files to eliminate duplicates
		sqlFilesRaw.forEach((file,index)=>{
			sqlFiles.set(   file[0]   +file[2]+file[4].toString(),file)
		})

		// Process new directory files
		for( var keyFile of dirFiles.keys()){
			if(!sqlFiles.has(keyFile)){
				var file = dirFiles.get(keyFile)
				var jpg = new JPG(file.fpath)
				log.info("Processing new file:",path.relative(this.galleryDir,jpg.fpath))
				await jpg.stat()
				var fpath = path.relative(this.galleryDir,jpg.fpath)
				var hash = (await jpg.hashfn(true)).hash
				var size = jpg.size.toString()
				var ctime = jpg.ctime.toISOString()
				var mtime = jpg.mtime.toISOString()
				var sqlFile = [fpath,hash,size,ctime,mtime,"1"]
				await sql.sInsertRow(this.dbname,"files",filesColumns,sqlFile)
				if (path.extname(jpg.fpath).toLowerCase() == '.jpg') {
					var existSqlImageRow = await sql.sReadTable(dbname,"images",["hash"], [[true,["hash"],"IS",hash]])
					if(existSqlImageRow.table.length < 1){
						await jpg.getExif()
						delete jpg.exif.exifData
						var gps = await jpg.getLocation(this.dbname)
						var idate = moment( jpg.exif.DateTimeOriginal ,"YYYY:MM:DD HH:mm:ss").toISOString()
						var event = jpg.fpath.split(path.sep)[jpg.fpath.split(path.sep).length-2]
						var desc = jpg.exif.ImageDescription ? jpg.exif.ImageDescription :  jpg.fpath
						var location = gps.location ? gps.location : null
						var cc = gps.cc ? gps.cc : null
						var people = null
						var rating = "0"
						var att = JSON.stringify( { exif:jpg.exif } )
						// Write data to SQL
						var imagesColumns = ["hash","idate","event","desc","location","cc","people","rating","att"]
						var imagesRow = [hash,idate,event,desc,location,cc,people,rating,att]
						await sql.sInsertRow(dbname,"images",imagesColumns,imagesRow)
					}
					var existingThumbRow = await sql.sReadTable(dbname,"thumbs",["hash"], [[true,["hash"],"IS",hash]])
					if (existingThumbRow.table.length < 1){
						var thumb = (await jpg.getThumb()).thumb
						var newRow = [hash,thumb]
						var columns = ["hash","thumb"]
						await sql.sInsertRow(dbname,"thumbs",columns,newRow)
					}
				}
			}
		}
		// must pull DB one more time since sql files content changed potentially
		sqlFilesRaw = (await sql.sReadTable(dbname,"files")).table
		sqlFiles = new Map()	// Map obj. to store keyed sql files to eliminate duplicates
		sqlFilesRaw.forEach((file,index)=>{
			sqlFiles.set(   file[0]   +file[2]+file[4].toString(),file)
		})
		// process old sql files
		for( var key of sqlFiles.keys()){
			var sqlFile = sqlFiles.get(key)
			if(!dirFiles.has(key)){ 
				sqlFile[5] = "0"  //mark it inactive in SQL DB
				await sql.sInsertRow(this.dbname,"files",filesColumns,sqlFile)
			}
			else if(!sqlFile[5]){
				sqlFile[6] = "1"  //if inactive mark it active
				await sql.sInsertRow(this.dbname,"files",filesColumns,sqlFile)
			}
		}

		return this;
	}	
	validFn(fn){
		if ( this.allowedFns.indexOf(fn) > -1 ){
			return true
		}
		else{
			return false
		}
	}
	async getselect2(ioData){
		ioData.att().countries = [{id:"US",text:"United States"},{id:"HU",text:"Hungary"}]
		ioData.att().event = ["2016-01-Naperville","1999-01-Hungary"]
		return ioData;
	}	
	async getimages(ioData){

		var start = true;
		var limit = ioData.att().limit
		var offset = ioData.att().offset
		
		var hash = ioData.att().hash
		var fpath = ioData.att().fpath
		var fname = ioData.att().fname
		var size = ioData.att().fsize
		var frdate = ioData.att().frdate
		var todate = ioData.att().todate
		var event = ioData.att().event
		var desc = ioData.att().desc
		var location = ioData.att().location
		var cc = ioData.att().cc
		var people = ioData.att().people
		var rating = ioData.att().rating
		
		var where = ""
		if (hash) where+= " AND images.hash LIKE '%"+hash+"%' "
		if (fpath && fname) where+= " AND fpath LIKE '%"+fpath+"%' "
		if (size) where+= " AND size LIKE '%"+size+"%' "
		if (frdate) where+= " AND idate > '"+frdate+"' "
		if (todate) where+= " AND idate < '"+todate+"' "
		if (event) where+= " AND event LIKE '%"+event+"%' "
		if (desc) where+= " AND desc LIKE '%"+desc+"%' "
		if (location) where+= " AND location LIKE '%"+location+"%' "
		if (cc) where+= " AND cc LIKE '%"+cc+"%' "
		if (people) where+= " AND people LIKE '%"+people+"%' "
		if (rating) where+= " AND rating IS '"+rating+"' "
		if (ioData.id() != "admin") where+= " AND rating IS NOT 1 AND rating IS NOT 0 "
		
		var presqlstm = "\
			SELECT * FROM (\
				SELECT * FROM  (\
					SELECT files.hash AS hash, fpath, size, idate, event, desc, location, cc, people, rating, att \
					FROM files \
					LEFT JOIN images ON files.hash = images.hash  \
					WHERE active IS '1' "+ where +" \
					) \
				GROUP by hash \
				ORDER BY idate asc ) as joinedTable \
			LEFT JOIN thumbs on joinedTable.hash = thumbs.hash"
			
		var sqlstm_count = " SELECT count(*) FROM ( "+presqlstm+" )"
		var sqlstm = presqlstm+" LIMIT " + limit +  ( offset ? (" OFFSET " + offset) : "" )
		log.debug("FILES - SQL STM:", sqlstm.replace(/\t/g,""))
		log.debug("receive: Start",Date())
		var result = await Promise.resolve({dbname:this.dbname, dbro:0,	dblog:0})
		.then(sql.open)
		.then(sql.stm(sqlstm_count))
		.then(sql.read)
		.then(sql.stm(sqlstm))
		.then(sql.read)
		.then(sql.close)
		//.then(sql.logSuccess,sql.logError)
		.then(function(json){try{
			log.debug("receive: End",Date())
			json.results.pop();
			var result = json.results.pop();
			var count = json.results.pop().table[0][0];
			ioData.att().cmd += "-success";
			ioData.att().images = {columns: result.columns, table: result.table, count: count , offset:offset}
			return (ioData);
		}catch(e){console.log(e)}})
		.catch(function(error){
			ioData.error = error
			ioData.att().cmd += "-error";
			return (ioData);
		})
		return result
	}









	

	
	async get_SqlImageRow(json){
		return this;
	}	
	async add_SqlImageRow(jpg){
		return this;
	}	
	async del_SqlImageRow(jpg){
		return this;
	}	
	async get_SqlFileRow(json){
		return this;
	}	
	async add_SqlFileRow(jpg){
		return this;
	}	
	async del_SqlFileRow(jpg){
		return this;
	}	
	async get_SqlThumbRow(jpg){
		return this;
	}	
	async add_SqlThumbRow(jpg){
		return this;
	}	
	async del_SqlThumbRow(jpg){
		return this;
	}	
}

module.exports = GalleryDB

if (require.main === module) {
    var argv = require('yargs')
    .usage('Usage: $0 [options]')
    .example('$0 -e <path> ', '"Process jpg files in <path>"')
    .option('exif', {
        alias: 'e',
        describe: 'change filenames to YYMMDD_MMddss_SSS.jpg recursively based on EXIF info in <path>',
        demandOption: true,
		nargs: 1
    })
    .help('h')
    .alias('h', 'help')
    .epilog('copyright ucipass 2017')
    .argv;

	var fpath = path.resolve( argv.e.trim() )
	var answer = require("positive")("CHANGE ALL JPG FILENAMES based EXIF values in "+fpath+"? (y/n)","no")
	if( answer ){
		console.log("current path is:", fpath)
	}else{
		console.log("Cancelled execution of :", fpath)
	}
	

}else{
	console.log("Gallery Module Started...")
}
