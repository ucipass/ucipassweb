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
var JPG = require('ucipass-jpg')
var JSONData = require('./lib/jsondata.js');

var logger = require('winston');
logger.emitErrs = true;
logger.loggers.add('GALLERYDB', { console: { level: 'info', label: "GALLERYDB", handleExceptions: true, json: false, colorize: true}});
var log = logger.loggers.get('GALLERYDB');

class GalleryDB {
	constructor(galleryDir,dbname){
		this.galleryDir		=	path.normalize(path.resolve(galleryDir))
		this.dbname 		= 	path.normalize(path.resolve(dbname))
		this.filelist		=	null
		this.allowedFns		= ["getselect2","imagesSelect","imagesUpdate"]	// functions allowed to be called via ioData remotely
	}
	async init(){
		var db = new File(this.dbname)
		if ( await db.isFile() ) {
			log.info("Database file:", this.dbname )
			return this
		}
		var json = {dbname:this.dbname}
		return Promise.resolve(json)
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
		.then(sql.close)
		.then(function(json){ log.info("Created tables: files,images,thumbs,locations,countries.",json.dbname) ; return json})
	}
	async getNewFiles(){
		var dbname = this.dbname;
		var dir = new Directory(this.galleryDir)
		var filesColumns = ["fpath","hash","size","ctime","mtime","active"]
		
		//Get all files and Sql files data
		log.debug("Get all fiels and sql files")
		var dirFilesRaw = await dir.filelist()
		var sqlFilesRaw = (await sql.sReadTable(dbname,"files")).table
		
		log.debug("Map obj. to store keyed directory files to eliminate duplicates")
		var dirFiles = new Map()	// Map obj. to store keyed directory files to eliminate duplicates
		dirFilesRaw.forEach((file,index)=>{
			dirFiles.set(   path.relative(this.galleryDir, file.fpath)   +file.size.toString()+file.mtime.toISOString(),file)
		})
		log.debug("Map obj. to store keyed sql files to eliminate duplicates")
		var sqlFiles = new Map()	// Map obj. to store keyed sql files to eliminate duplicates
		sqlFilesRaw.forEach((file,index)=>{
			sqlFiles.set(   file[0]   +file[2]+file[4].toString(),file)
		})

		// Process new directory files
		var newFiles = []
		for( let keyFile of dirFiles.keys()){
			if(!sqlFiles.has(keyFile)){
				newFiles.push(dirFiles.get(keyFile))
			}
		}
		for( let i=0; i< newFiles.length; i++){try{
			var file = newFiles[i]
			var jpg = new JPG(file.fpath)
			log.info("Processing new file:",i,"of",newFiles.length,":",path.relative(this.galleryDir,jpg.fpath))
			await jpg.stat()
			var fpath = path.relative(this.galleryDir,jpg.fpath)
			var hash = (await jpg.hashfn(true)).hash
			var size = jpg.size.toString()
			var ctime = jpg.ctime.toISOString()
			var mtime = jpg.mtime.toISOString()
			var sqlFile = [fpath,hash,size,ctime,mtime,"1"]
			log.debug("Before inserting file into files table")
			await sql.sInsertRow(this.dbname,"files",filesColumns,sqlFile)
			if (path.extname(jpg.fpath).toLowerCase() == '.jpg') {
				log.debug("Reading Existing images sql table")
				var existSqlImageRow = await sql.sReadTable(dbname,"images",["hash"], [[true,["hash"],"IS",hash]])
				if(existSqlImageRow.table.length < 1){
					await jpg.getExif()
					delete jpg.exif
					var gps = await this.getLocation(this.dbname)
					var idate = moment( jpg.DateTimeOriginal ,"YYYY:MM:DD HH:mm:ss").toISOString()
					var event = jpg.XPSubject ? jpg.XPSubject : jpg.fpath.split(path.sep)[jpg.fpath.split(path.sep).length-2]
					log.silly("ImageDescription",jpg.ImageDescription,"Path",jpg.fpath)
					var desc = jpg.ImageDescription ? jpg.ImageDescription.trim() :  jpg.fpath
					var location = gps.location
					var cc = gps.cc
					log.silly("XPKeywords",jpg.XPKeywords,"Path",jpg.fpath)
					var people = jpg.XPKeywords? jpg.XPKeywords.replace(/[^\x1E-\x7F]/g, "") : null 	
					var rating = jpg.Rating 
					var att = jpg.XPComment ? jpg.XPComment : JSON.stringify( { location:location, cc:cc, lat:jpg.lat, lon:jpg.lon } )
					// Write data to SQL
					var imagesColumns = ["hash","idate","event","desc","location","cc","people","rating","att"]
					var imagesRow = [hash,idate,event,desc,location,cc,people,rating,att]
					log.debug("Befire inserting images sql table")
					await sql.sInsertRow(dbname,"images",imagesColumns,imagesRow)
				}
				var existingThumbRow = await sql.sReadTable(dbname,"thumbs",["hash"], [[true,["hash"],"IS",hash]])
				if (existingThumbRow.table.length < 1){
					var thumb = (await jpg.getThumb(50)).thumb
					var newRow = [hash,thumb]
					var columns = ["hash","thumb"]
					await sql.sInsertRow(dbname,"thumbs",columns,newRow)
				}
			}

		}catch(err){ 
			log.error(err); 
			return Promise.reject(err) 
		}}
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
	async getLocation(dbname){try{
		var jpg = this;
		if ( !jpg || !jpg.exif || !jpg.exif.gps|| !jpg.exif.gps.lon || !jpg.exif.gps.lat  ) {
			log.silly("LOCATION: No location info found in Exif")
			jpg.geo = {}
			return Promise.resolve(jpg.geo) ; 
		}
		var lat = jpg.exif.gps.lat ;
		var lon = jpg.exif.gps.lon ;
		var hash = jpg.hash ? jpg.hash : await jpg.hashfn().hash;
		var json = {dbname:dbname}
		json.sqlstm = "SELECT * FROM locations WHERE "+	" lon < " + (lon+2).toString()+	" AND lon > " + (lon-2).toString()+	" AND lat < " + (lat+2).toString()+	" AND lat > " + (lat-2).toString() ;			
		return sql.open(json)
		.then(sql.stm(json.sqlstm))
		.then(sql.read)
		.then(function(json){
			var shortestRow = []
			var distance = 10000000 ;
			log.silly("LOCATION: MATCHES", json.results[json.results.length-1].table.length)
			var potGPS=json.results.pop().table.forEach(function(item,index){
				var from = {latitude: parseFloat(jpg.exif.gps.lat), longitude:  parseFloat(jpg.exif.gps.lon)}
				var to = {latitude:  parseFloat(item[0]), longitude: parseFloat(item[1]) }
				var cDistance = geolib.getDistance(from,to)
				//log.silly(item);
				//log.silly("LOCATION: Distance",distance,cDistance,from,to);
				if (cDistance < distance) { distance = cDistance ; shortestRow=item}
				})
			var lat = shortestRow[0]
			var lon = shortestRow[1]
			var location = shortestRow[2]
			var cc = shortestRow[3]
			var geo = { location:location,cc:cc,lat:lat,lon:lon}
			log.debug("LOCATION:",geo)
			return(geo)
			})

	}catch(err){ log.error(err); return Promise.reject(err) }}
	async getselect2(ioData){
		var json = {dbname:this.dbname}
		await sql.open(json)
		json.sqlstm = "SELECT iso, country FROM countries"
		await sql.read(json)
		var countries = json.results.pop().table.map((item)=>{ return {id: item[0], text: item[1] } 	})
		json.sqlstm = "SELECT DISTINCT event from images"
		await sql.read(json)
		var events = json.results.pop().table
		await sql.close(json)
		ioData.att().countries = [{id:"US",text:"United States"},{id:"HU",text:"Hungary"}]
		ioData.att().event = ["2016-01-Naperville","1999-01-Hungary"]
		ioData.att().countries = countries
		ioData.att().event = events
		return ioData;
	}	
	async imagesSelect(ioData){

		var f = ioData.att().filter
		
		var where = ""
		if (f.hash) where+= " AND images.hash LIKE '%"+f.hash+"%' "
		if (f.fpath) where+= " AND fpath LIKE '%"+f.fpath+"%' "
		if (f.size) where+= " AND size LIKE '%"+f.size+"%' "
		if (f.frdate) where+= " AND idate > '"+f.frdate+"' "
		if (f.todate) where+= " AND idate < '"+f.todate+"' "
		if (f.event) where+= " AND event LIKE '%"+f.event+"%' "
		if (f.desc) where+= " AND desc LIKE '%"+f.desc+"%' "
		if (f.location) where+= " AND location LIKE '%"+f.location+"%' "
		if (f.cc) where+= " AND cc LIKE '%"+f.cc+"%' "
		if (f.people) where+= " AND people LIKE '%"+f.people+"%' "
		if (f.rating) where+= " AND rating IS '"+f.rating+"' "
		if (ioData.id() != "admin") where+= " AND rating IS NOT 1 "
		
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
		var sqlstm = presqlstm+" LIMIT " + f.limit +  ( f.offset ? (" OFFSET " + f.offset) : "" )
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
			var totalCount = json.results.pop().table[0][0];
			ioData.att().cmd += "-success";
			ioData.att().images = {columns: result.columns, table: result.table, totalCount:totalCount}
			return (ioData);
		}catch(e){console.log(e)}})
		.catch(function(error){
			ioData.error = error
			ioData.att().cmd += "-error";
			return (ioData);
		})
		return result
	}
	async imagesUpdate(ioData){

		var newRows = ioData.att().newRows
		
		var sqlstmArray = []
		for(let i = 0; i < newRows.length; i++){
			let file = newRows[i];
			let sqlstm = "UPDATE images SET "
			for(let column in file){
				sqlstm += column+" = '"+file[column]+"' ,"
			}
			sqlstm = sqlstm.slice(0, -1); //chop off the last comma
			sqlstm += " WHERE hash IS '"+file.hash+"' "
			sqlstmArray.push(sqlstm)
		}

		var json = {dbname:this.dbname}
		await sql.open(json)
		for(let i = 0 ; i<sqlstmArray.length ; i++){
			log.debug("FILES - SQL STM:", sqlstmArray[i])
			log.silly("receive: Start",Date())
			json.sqlstm = sqlstmArray[i]
			await sql.write(json)
		}
		await sql.close(json)
		return ioData;
	}



	convertGPS(days, minutes, seconds, direction) {
		try{
			direction.toUpperCase();
			var dd = days + minutes/60 + seconds/(60*60);
			if (direction == "S" || direction == "W") {	dd = dd*-1;	} // Don't do anything for N or E
			return dd.toFixed(7);
		}
		catch(err){
			log.error("ConvertGPS Error: Incorrect Format")
			throw("ConvertGPS Error: Incorrect Format")
			return 0;
		}
	}
	validFn(fn){
		if ( this.allowedFns.indexOf(fn) > -1 ){
			return true
		}
		else{
			return false
		}
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
