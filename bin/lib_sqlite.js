var sqlite3 = require('sqlite3').verbose();
var log = require('./logger.js').loggers.get('SQLITE');
var loglevel = 0;
function logSuccess(success){ console.log("LogPromise SUCCESS:\n", loglevel<2? success : JSON.stringify(success,null,3)) ; return Promise.resolve(success)}
function logError(error){ console.log("LogPromise ERROR:\n", JSON.stringify(error,null,3)) ; return Promise.reject(error)}

function createTable(tablename,columns_types){return function(json){return new Promise(function(resolve,reject){
	var sqlstm = "";
	columns_types.forEach(function(item,index){
		if(index==0){
			sqlstm += "CREATE TABLE IF NOT EXISTS " + tablename + " ( " + item[0] + " " + item[1] 
			}
		else{
			sqlstm += " , " + item[0] + " " + item[1] 
			}
		})
	sqlstm += " )"
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function dropTable(tablename){return function(json){return new Promise(function(resolve,reject){
	var sqlstm = "DROP TABLE "+tablename;
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function insertRow(tablename,columns,newRow){return function(json){return new Promise(function(resolve,reject){
	var sqlstm = "INSERT OR REPLACE INTO " + tablename ;
	sqlstm = sqlstm + " ( "
	for (var i=0;i<columns.length;i++){
		if(i>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + columns[i];
	}
	sqlstm = sqlstm +" ) VALUES ";
	sqlstm = sqlstm +"(";
	for (var y=0;y<newRow.length;y++){
		if(y>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + "'"+ ( newRow[y] ? newRow[y].replace("'","''") : "" ) + "'";
		}
	sqlstm = sqlstm +")";
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function insIgnRow(tablename,columns,newRow){return function(json){return new Promise(function(resolve,reject){
	var sqlstm = "INSERT OR IGNORE INTO " + tablename ;
	sqlstm = sqlstm + " ( "
	for (var i=0;i<columns.length;i++){
		if(i>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + columns[i];
	}
	sqlstm = sqlstm +" ) VALUES ";
	sqlstm = sqlstm +"(";
	for (var y=0;y<newRow.length;y++){
		if(y>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + "'"+newRow[y].replace("'","''")+ "'";
		}
	sqlstm = sqlstm +")";
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function insertRows(tablename,columns,newRows){return function(json){return new Promise(function(resolve,reject){
	var sqlstm = "INSERT OR REPLACE INTO " + tablename ;
	sqlstm = sqlstm + " ( "
	for (var i=0;i<columns.length;i++){
		if(i>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + columns[i];
	}
	sqlstm = sqlstm +" ) VALUES ";
	newRows.forEach(function(newRow,index){
		if(index){sqlstm += ","}
		sqlstm = sqlstm +"(";
		for (var y=0;y<newRow.length;y++){
			if(y>0) sqlstm = sqlstm + ",";
			sqlstm = sqlstm + "'"+newRow[y].replace("'","''")+ "'";
			}
		sqlstm = sqlstm +")"
		});
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function insertRows2(tablename,columns,newRows){return function(json){return new Promise(function(resolve,reject){
	function recursive(){
	if (newRows.length == 0){resolve(json);return(json)}
	var row = newRows.pop()
	insertRow(tablename,columns,row)(json)
	.then(function(json){recursive()})
	.catch(reject)
	}
	recursive()
	})}}

function insIgnRows(tablename,columns,newRows){return function(json){return new Promise(function(resolve,reject){
	var sqlstm = "INSERT OR IGNORE INTO " + tablename ;
	sqlstm = sqlstm + " ( "
	for (var i=0;i<columns.length;i++){
		if(i>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + columns[i];
	}
	sqlstm = sqlstm +" ) VALUES ";
	newRows.forEach(function(newRow,index){
		if(index){sqlstm += ","}
		sqlstm = sqlstm +"(";
		for (var y=0;y<newRow.length;y++){
			if(y>0) sqlstm = sqlstm + ",";
			sqlstm = sqlstm + "'"+newRow[y].replace("'","''")+ "'";
			}
		sqlstm = sqlstm +")"
		});
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function updateRow(tablename,columns,oldRow,newRow){return function(json){return new Promise(function(resolve,reject){
	//console.log(tablename,columns,oldRow,newRow)
	var sqlstm = "UPDATE " + tablename +" SET ";
	for (var i=0;i<newRow.length;i++){
		if(i>0) {sqlstm = sqlstm + "," ;}
		sqlstm = sqlstm + columns[i]+"="+"'"+newRow[i].replace("'","''")+"' ";
		}
	sqlstm = sqlstm + " WHERE ";
	for (var i=0;i<oldRow.length;i++){
		if(i>0) {sqlstm = sqlstm + " AND "; }
		sqlstm = sqlstm +columns[i]+"="+"'"+oldRow[i].replace("'","''")+"' ";
		}
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function deleteRow(tablename,columns,oldRow){return function(json){return new Promise(function(resolve,reject){
	var sqlstm = "DELETE FROM " + tablename ;
	sqlstm = sqlstm + " WHERE ";
	for (var i=0;i<columns.length;i++){
		if(i>0) sqlstm = sqlstm + " AND ";
		sqlstm = sqlstm +columns[i]+"="+"'"+oldRow[i].replace("'","''")+"' ";
		}
	json.sqlstm = sqlstm
	write(json).then(resolve)
	.catch(close).catch(reject)
	})}}

function readTable(tablename,columns,filters,orders,limit){return function(json){return new Promise(function(resolve,reject){
	/* INCOMING JSON
	** json.dbname -> database name
	** tablename name of the table
	** columns optional, array of columnnames if present only send specific columns
	** filters optional, array of filters [not,columnname,command,filtervalue] array to filter out fields 	
	** orders optional, array of order-by [columnname,true/false] true descending	
	** limit optional, limit the returned fields by a "number"
	*/
	try{
	
	var sqlstm = "SELECT ";
	if (columns){
		columns.forEach(function(col,index){ sqlstm += index ? " ,"+col : col ; })
		sqlstm += " FROM " +tablename;
		}
	else { sqlstm += " * FROM " +tablename;}
	if (filters){
		var first = true;
		filters.forEach(function(filter,index){
			if (filter && filter != "" && filter != []){
				if(first){ sqlstm += " WHERE "; first=false; }
				else { sqlstm += " AND " }
				sqlstm += filter[0] ? "" : " NOT "
				sqlstm += " " + filter[1] + " "
				sqlstm += " " + filter[2] + " "
				if ( filter[2] == 'LIKE') {sqlstm += "'%" + filter[3] + "%'"}
				else {sqlstm += "'" + filter[3] + "'"} 
				}
			})
		}
	if (orders){
		orders.forEach(function(order,index){ 
			if(!index){ sqlstm += " ORDER BY " + order[0]; }
			else { sqlstm += ","+order[0] }
			if(order[1]) {sqlstm += " DESC"}
			})
		}	
	if (limit) {sqlstm += " LIMIT " + limit;}
	json.sqlstm = sqlstm;
	
	}catch(e){console.log("SQL readTable Error: ",e);reject("SQL readTable Error: "+e.toString());return;}
	read(json)
	//.then(s => {console.log("SUC",s);return Promise.resolve(s)},e => {console.log("ERR",e);return Promise.reject(e)})
	.then(resolve)
	.catch(close)
	.catch(reject)
	})}}

function readTableColumns(tablename){return function(json){return new Promise(function(resolve,reject){
	/* INCOMING JSON
	** json.dbname -> database name
	** tablename name of the table
	*/
	try{
	json.sqlstm = "pragma table_info("+tablename+")";
	}catch(e){console.log("SQL readTableColums Error: ",e);reject("SQL readTableColums Error: "+e.toString());return;}
	read(json)
	.then(json=>{
		try{
		var result = json.results.pop()
		var columnNames = []
		result.table.forEach(function(item,index){
			columnNames.push(item[1]);
			})
		delete result.table
		result.columns = columnNames
		json.results.push(result)
		return Promise.resolve(json);
		}catch(e){return Promise.reject(e.toString());}
		})
	.then(resolve)
	.catch(close)
	.catch(reject)
	})}}
	
function readTableNames(){return function(json){return new Promise(function(resolve,reject){
	Promise.resolve(json)
	.then(stm("SELECT name FROM sqlite_master WHERE type='table'"))
	.then(read)
	.then(resolve)
	.catch(close)
	.catch(reject)
	})}}

function saveCSV(filename){ return function(json){return new Promise(function(resolve,reject){try { //Saves the last SQL Read result
	Promise.resolve(json)
	.then(json=>{
		var dataset = json.results.pop()
		var fs = require('fs')
		var csv = require('fast-csv')
		var ws = fs.createWriteStream(filename);
		var columns = dataset.columns
		var data = dataset.table
		var start = new Date().getTime();
		data.unshift(columns)
		csv
		.write(data,{headers: true})
		.pipe(ws)
		.on('close', () => {
			log.debug("SQL SAVE CSV: "+filename)
			data.shift(columns)
			json.results.push(dataset)
			var execTime = new Date().getTime() - start ;
			json.results.push({csvfilesaved:filename,execTime:execTime,size:dataset.table.length})
			resolve(json)
			return;
			})
		.on('error', (e) => {
			var error = "SQL SAVE CSV ERROR:"+filename+e.toString()
			console.log(error)
			data.shift(columns)
			json.results.push(dataset)
			json.results.push(error)
			reject(json)
			return;
			})
		})
	}catch(err){console.log(err);reject(err.toString())}})}}

function printLastTable(json){return new Promise(function(resolve,reject){try { //Saves the last SQL Read result
	
	var result = json.results[json.results.length-1]
	console.log(result.columns)
	console.log(result.table)
	return json;

	}catch(err){console.log(err);reject(err.toString())}})}

function loadCSV(filename,tablename){ return function(json){return new Promise(function(resolve,reject){try{ // Loads and Saves CSV file in DB
	var fs = require('fs')
	var csv = require('fast-csv')
	var start = new Date().getTime()
	var stream = fs.createReadStream(filename);
	var i = 0;
	var columns_types = []
	var columns = null
	var table = []
	log.debug("SQL OPEN CSV: "+filename)
	var csvStream = csv()
	.on("data", function(data){
		if (i) {table.push(data)}
		else {columns = data ; columns.forEach(function(item){columns_types.push([item,"TEXT"])})}
		i++
		})
	.on("end", function(){
		var execTime = new Date().getTime() - start
		json.results.push({csvfileopened:filename,execTime:execTime ,size:table.length});
		//console.log("LOAD FINISH",columns,table)
		Promise.resolve(json)
		.then(createTable(tablename,columns_types))
		.then(insertRows(tablename,columns,table))
		//.then(function(json){
		//	insertRow(tablename,columns[0],table)(json).then(json=>{return json})
		//	})
		.then(resolve,reject)
		});
	 stream.pipe(csvStream);	
	}catch(err){console.log("LOAD CSV ERROR:",err);reject(err.toString())}})}}

function stm(param){ //returns a "thenable" function allowing SQL statement update in param
	var isObject = param !== null && typeof param === 'object' ;
	if (!isObject){
		return function(json){return new Promise(function(resolve,reject){ json.sqlstm = param; resolve(json); })}
		}
	else {
		console.log("SQL INVALID CMD")
		return function(json){return new Promise(function(resolve,reject){ json.err = "SQL INVALID CMD: "+param.cmd ; reject(json); })}
		}
	}

function open(json){ return new Promise(function(resolve,reject){ // opens database json.dbname
	try{
		loglevel = loglevel ? loglevel : json.dblog; // locally defined loglevel will overwrite the one coming with json
		json.db = new sqlite3.Database(json.dbname, json.dbro? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE), function(err){
			if(!json.results){json.results = []} // create array that will hold the results if not already created
					if (err) { 
					console.log("SQL OPEN ERROR: ", err); 
					json.err = err.toString() ; 
					json.err = err.toString() ; 
					reject(json); 
					return;
				}
			else { 
				log.debug("SQL OPEN: SUCCESS "+json.dbname); 
				log.silly(this); 
				json.results.push({dbopen:json.dbname});
				resolve(json); }		
			});
		}catch(err){ 
			log.error("SQL OPEN ERROR:",err); 
			json.err = err.toString() ; 
			reject(err); 
			return;
			}
	})}
function openro(json){ return new Promise(function(resolve,reject){ // opens database json.dbname
	try{
		loglevel = loglevel ? loglevel : json.dblog; // locally defined loglevel will overwrite the one coming with json
		json.db = new sqlite3.Database(json.dbname, sqlite3.OPEN_READONLY , function(err){
			if(!json.results){json.results = []} // create array that will hold the results if not already created
					if (err) { console.log("SQL OPEN ERROR: ", err); json.err = err.toString() ; reject(json); return;}
			else { log.debug("SQL OPEN: SUCCESS "+json.dbname); log.silly(this); json.results.push({dbopen:json.dbname});resolve(json); }		
			});
		}catch(err){ 
			console.log("SQL OPEN ERROR:"); 
			json.err = err.toString() ; 
			reject(err); 
			return;
			}
	})}

function write(json){ return new Promise(function(resolve,reject){ // executes sql statement(insert,update,create) and appends results to json.results array
	if (!json.sqlstm) {json.err="No Sql Statement given"; log.error(json.err); reject(json)}
	log.silly("SQL STM:",json.sqlstm)
	var sqlstm = json.sqlstm;
	var start = new Date().getTime();
	json.db.run(sqlstm,function(err){
		if (err) { 
			log.error("SQL WRITE ERROR: ", err,sqlstm ); 
			json.err = err.toString() ; 
			reject(err); 
			return;
		}
		else { 
			log.debug("SQL WRITE: SUCCESS "+sqlstm.substring(0,100)+"...");
			var execTime = new Date().getTime() - start ;
			var result = {sqlstm:sqlstm.substring(0,100), lastID: this.lastID ,  changes: this.lastID , execTime:execTime}
			log.silly(result) ; 
			json.results.push(result);
			resolve(json); }
		});
	})}

function read(json){ return new Promise(function(resolve,reject){ // executes sql select statment and appends rows to json.results array
	if (!json.sqlstm) {json.err="No Sql Statement given"; log.error(json.err); reject(json);return}
	var sqlstm = json.sqlstm
	var header = 1;
	var columns = [];
	var error = null;
	var sqlRows =[];
	var dataSet = {};	
	var start = new Date().getTime();
	json.db.each(sqlstm,
		//Executed for every row
		function(err, row) {
			if (err) { console.log("SQL READ: ERROR",err); json.err = err.toString(); reject(json); return;}
			// Read column names first
			if (header) {
				for (var i=0; i<Object.keys(row).length; i++){columns.push(Object.keys(row)[i]);}
				header = 0;
				}
			// Add every row 1 by 1
			var tmprow = [];
			for (var x=0; x<columns.length; x++){tmprow.push(row[columns[x]]);}
			sqlRows.push(tmprow);		
			},
		//Executed at the end
		function(err){
			if (err) {console.log("SQL READ: ERROR",err); json.err = err.toString(); reject(json); return;}
			dataSet.sqlstm = sqlstm;
			dataSet.columns = columns;
			dataSet.table = sqlRows;
			dataSet.size = sqlRows.length;
			dataSet.execTime = new Date().getTime() - start ;
			json.results.push(dataSet)
			log.debug("SQL READ: SUCCESS "+sqlstm.substring(0,100)+"...");
			log.silly(sqlstm);
			log.silly(dataSet);
			resolve(json);
			}
		)
	})}

function close(json){ return new Promise(function(resolve,reject){ // closes database json.dbname
	if (!json.db || !json.db.open){
		log.error("SQL CLOSE: ALREADY CLOSED OR NEVER OPENED"); 
		if(json.err){ reject(json); return; }
		else{ resolve(json); return;}
		}
	json.db.close(function(err){
		if(err){
			console.log("SQL CLOSE: ERROR",err);
			json.err = json.err || err.toString(); 
			reject(json); return;
			}
		else{
			log.debug("SQL CLOSE: SUCCESS "+json.dbname); 
			if(json.err){ reject(json); return; }
			else{ json.results.push({dbclose:json.dbname});resolve(json); return;}
			}
		})
	})}

function cleanup(json){ return new Promise(function(resolve,reject){try{ // closes database json.dbname
	delete json.results;
	delete json.sqlstm;
	delete json.db;
	resolve(json)
	}catch(err){console.log(err);reject(err.toString())}})}

function promiseEach(array,promiseFn){return new Promise(function(resolve,reject){try {
	var promiseArray = [];
	var json = { array: array, counter: 0 }
	for (var i = 0; i < array.length; i++) { promiseArray.push(promiseFn) }
	promiseArray.reduce(function(preFn,curFn,index,pArray){
		return 	preFn.then( z =>  json.array[json.counter++] ).then(curFn)
		}, 
		Promise.resolve(json.array[json.counter]))
	.then(resolve,reject)
	}catch(err){console.log("promiseEach ERROR:",err);reject(err.toString())}})}

	
//
// SINGLE FUNCTIONS
//
function sReadTable(dbname,tablename,columns,filters,orders,limit){return new Promise(function(resolve,reject){
	var json = {
		dbname: dbname, 
		sqlstm: null
	}

	/* INCOMING JSON
	** json.dbname -> database name
	** tablename name of the table
	** columns optional, array of columnnames if present only send specific columns
	** filters optional, array of filters [not,columnname,command,filtervalue] array to filter out fields 	
	** orders optional, array of order-by [columnname,true/false] true descending	
	** limit optional, limit the returned fields by a "number"
	*/
	try{
	
		var sqlstm = "SELECT ";
		if (columns){
			columns.forEach(function(col,index){ sqlstm += index ? " ,"+col : col ; })
			sqlstm += " FROM " +tablename;
			}
		else { sqlstm += " * FROM " +tablename;}
		if (filters){
			var first = true;
			filters.forEach(function(filter,index){
				if (filter && filter != "" && filter != []){
					if(first){ sqlstm += " WHERE "; first=false; }
					else { sqlstm += " AND " }
					sqlstm += filter[0] ? "" : " NOT "
					sqlstm += " " + filter[1] + " "
					sqlstm += " " + filter[2] + " "
					if ( filter[2] == 'LIKE') {sqlstm += "'%" + filter[3] + "%'"}
					else {sqlstm += "'" + filter[3] + "'"} 
					}
				})
			}
		if (orders){
			orders.forEach(function(order,index){ 
				if(!index){ sqlstm += " ORDER BY " + order[0]; }
				else { sqlstm += ","+order[0] }
				if(order[1]) {sqlstm += " DESC"}
				})
			}	
		if (limit) {sqlstm += " LIMIT " + limit;}
		json.sqlstm = sqlstm;
	
	}catch(e){
		log.error("SQL readTable Error: ",e);reject("SQL readTable Error: "+e.toString());return;
	}
	open(json)
	.then(read)
	//.then(s => {console.log("SUC",s);return Promise.resolve(s)},e => {console.log("ERR",e);return Promise.reject(e)})
	.then(close)
	.then(json => {
		json.results.pop();
		var r = json.results.pop() ; 
		return({columns:r.columns, table:r.table}) 
		//return(results) 
		}
	)
	.then(resolve)
	.catch(close)
	.catch(reject)
	})}







function sInsertRow(dbname,tablename,columns,newRow){return new Promise(function(resolve,reject){
	var json = {
		dbname: dbname, 
		sqlstm: null
	}
	var sqlstm = "INSERT OR REPLACE INTO " + tablename ;
	sqlstm = sqlstm + " ( "
	for (var i=0;i<columns.length;i++){
		if(i>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + columns[i];
	}
	sqlstm = sqlstm +" ) VALUES ";
	sqlstm = sqlstm +"(";
	for (var y=0;y<newRow.length;y++){
		if(y>0) sqlstm = sqlstm + ",";
		sqlstm = sqlstm + "'"+ ( newRow[y] ? newRow[y].replace("'","''") : "" ) + "'";
		}
	sqlstm = sqlstm +")";
	log.debug("STM: ",sqlstm)
	json.sqlstm = sqlstm
	open(json)
	.then(write)
	.then(close)
	.then(resolve)
	.catch(close)
	.catch(reject)
	})}

function sDeleteRow(dbname,tablename,columns,oldRow){return new Promise(function(resolve,reject){
	var json = {
		dbname: dbname, 
		sqlstm: null
	}
	var sqlstm = "DELETE FROM " + tablename ;
	sqlstm = sqlstm + " WHERE ";
	for (var i=0;i<columns.length;i++){
		if(i>0) sqlstm = sqlstm + " AND ";
		sqlstm = sqlstm +columns[i]+"="+"'"+oldRow[i].replace("'","''")+"' ";
		}
	json.sqlstm = sqlstm
	open(json)
	.then(write)
	.then(close)
	.then(resolve)
	.catch(close)
	.catch(reject)
	})}

function sUpdateRow(dbname,tablename,columns,oldRow,newRow){return new Promise(function(resolve,reject){
	//console.log(tablename,columns,oldRow,newRow)
	var json = {
		dbname: dbname, 
		sqlstm: null
	}
	var sqlstm = "UPDATE " + tablename +" SET ";
	for (var i=0;i<newRow.length;i++){
		if(i>0) {sqlstm = sqlstm + "," ;}
		sqlstm = sqlstm + columns[i]+"="+"'"+newRow[i].replace("'","''")+"' ";
		}
	sqlstm = sqlstm + " WHERE ";
	for (var i=0;i<oldRow.length;i++){
		if(i>0) {sqlstm = sqlstm + " AND "; }
		sqlstm = sqlstm +columns[i]+"="+"'"+oldRow[i].replace("'","''")+"' ";
		}
	json.sqlstm = sqlstm
	open(json)
	.then(write)
	.then(close)
	.then(resolve)
	.catch(close)
	.catch(reject)
	})}

exports.open		= open;
exports.openro		= openro;
exports.read		= read;
exports.write		= write;
exports.close		= close;
exports.cleanup		= cleanup;
exports.stm			= stm;
exports.logSuccess	= logSuccess;
exports.logError	= logError;
exports.loadCSV		= loadCSV
exports.saveCSV		= saveCSV
exports.readTable	= readTable
exports.insertRow	= insertRow
exports.insertRows	= insertRows
exports.insIgnRow	= insIgnRow
exports.insIgnRows	= insIgnRows
exports.updateRow	= updateRow
exports.printLastTable	= printLastTable
exports.createTable = createTable
exports.dropTable	= dropTable
exports.deleteRow	= deleteRow

exports.sReadTable	= sReadTable
exports.sInsertRow	= sInsertRow
exports.sDeleteRow	= sDeleteRow
exports.sUpdateRow	= sUpdateRow
/*	
var json = {
	dbname:":memory:", 
	sqlstm: null,
	dbro:0, // optional
	dblog:1 // optional
	}

open(  json )
.then( createTable("t1",[["f1","TEXT"],["f2","TEXT"]]) )
.then( insertRow( "t1", ["f1","f2"], ["a1","a2"]) )
.then( insertRows("t1", ["f1","f2"], [["b1","b2"], ["c1","c2"], ["c3","c4"], ["c5","c6"], ["c7","c8"], ["c9","c10"]]))
.then( updateRow("t1", ["f1","f2"], ["b1","b2"], ["a3","a4"]) )
.then( deleteRow("t1", ["f1","f2"], ["c1","c2"]) )
.then( readTableNames() )
.then( readTableColumns("t1") )
.then( printLastTable)
.then( readTable("t1", ["f1","f2"], [ [true,"f1","LIKE","c"] ],[ ["f1",false],["f2",false] ],"10") )
.then( saveCSV("test.csv") )
.then( dropTable("t1") )
.then( close )
.then( logSuccess,logError)
*/
/*TEST MULTI STEP FOR MEMORY DB
Promise.resolve( {	dbname:':memory:',	dbro:0,	dblog:1}	)
.then(open)
.then(stm('CREATE TABLE mytesttable1 ( f1 TEXT PRIMARY KEY NOT NULL  , f2 TEXT NOT NULL  , f3 TEXT NOT NULL  , f4 TEXT NOT NULL  )'))
.then(write)
.then(stm('INSERT OR REPLACE INTO mytesttable1 (f1,f2,f3,f4) VALUES ("A1","B1","C1","D1"),("A2","B2","C2","D2"),("A3","B3","C3","D3")'))
.then(write)
.then(saveCSV("my.csv","mytesttable1"))
.then(close)
.then(logSuccess,logError)
.catch(close)
*/
/*TEST PROCESS SPEED FOR SQL QUERY AND SAVING/LOADING CSV FILES
Promise.resolve( {	dbname:'.//db//oag.db',	dbro:0,	dblog:1} )
.then(open)
.then(stm("select fraircode,toaircode,c.alcode as alcode, a1.[alName] as alname,share, \
						frdate,t1.[airportName] as frair, t2.[airportName] as toair, \
						c1.[cName] fname, c2.[cName] tname, c1.[cRegion] as freg, c2.[cRegion] as treg, c1.[cTC] ftc, c2.[cTC] ttc \
						from CityPairsAirlines c \
					inner join airlines a1 on c.[alCode] = a1.[alCode] \
					inner join airports t1 on fraircode = t1.airportCode \
					inner join airports t2 on toaircode = t2.airportCode \
					inner join countries c1 on t1.countrycode = c1.[cc] \
					inner join countries c2 on t2.countrycode = c2.[cc] "))
.then(read)
.then(saveCSV("large.csv"))
.then(close)
.then(json => { json.dbname = ":memory:" ; return json})
.then(open)
.then(loadCSV("large.csv","t1"))
.then(stm("SELECT * FROM t1"))
.then(read)
.then(close)
.then(logSuccess,logError)
*/
/* LOAD CSV TO DB
Promise.resolve( {	dbname:'.//private//test//db//pictures.db',	dbro:0,	dblog:1} )
.then(open)
.then(loadCSV(".//db//countries.csv","countries"))
.then(close)
.then(logSuccess,logError)
*/
/*
Promise.resolve( {	dbname:'.//private//test//db//pictures.db',	dbro:0,	dblog:0} )
.then(open)
.then(stm("\
			SELECT * FROM (\
			SELECT files.hash AS hash, fpath, fname, fsize, date, event, desc, location, cc, people, att \
			FROM files LEFT JOIN images ON files.hash = images.hash  \
			WHERE type is 'jpg'  \
			) \
			GROUP by hash \
			ORDER BY date desc\
			"))
.then(read)
.then(function(json){return new Promise(function(resolve,reject){try {
	var array = []
	json.results.pop().table.forEach(function(item){
		var path = item[1].split('/')
		var event = item[5]
		if (path[0].length == 4 && path[1] && !event ){
			array.push( [ [item[0]], [ item[0],path[1] ] ] );
			}
		})
	promiseEach(array,function(row){
		console.log(row[0],row[1])
		return updateRow("images",["hash","event"],row[0],row[1])(json)
		})
	.then(resolve,reject);
	}catch(e){console.log(e)}})})
.then(close)
.then(logSuccess,logError)
*/



