/***************************************************************************************************************
json
 data
  type
  id
  attributes
	msg
	cmd
	data
	everything else in attributes
 error
****************************************************************************************************************/

/***************************************************INCLUDE******************************************************
	JQUERY for POST
****************************************************************************************************************/

function JSONData(id,type,attributes){
	this.json = {};
	this.json.data = {};
	this.json.data.id = id;
	this.json.data.type = type;
	this.json.data.attributes = attributes;
	this.json.error = null;
	this.set = function(type,id,attributes){this.json.data = {type:type,id:id,attributes:attributes};};
	this.setjson = function(msg){this.json=msg;return this;};
	this.getjson = function(){return this.json;};
	this.setdata = function(msg){this.json.data=msg;};
	this.getdata = function(){return this.json.data;};
	this.err  = function(){return this.json.error;};
	this.type = function(){return this.json.data.type;};
	this.id = function(){return this.json.data.id;};
	this.attributes = function(){return this.json.data.attributes;};
	this.cmd = function(){return this.json.data.attributes.cmd;};
	this.att = function(){return this.json.data.attributes;};
	this.get = function(){return this.json.data;};
	this.isValid = function(){var x=this.json.data;return(Boolean(x) && Boolean(x.id) && Boolean(x.type) &&  Boolean(x.attributes.cmd));};
	this.isInvalid = function(){return (!this.isValid());};
	this.log = function(logmsg){
		if(this.json.error) {
			console.log(logmsg ? logmsg : "ERROR:", this.json.error) ;} 
		else {
			if(this.isValid()) {  console.log(logmsg ? logmsg : "",this.type(),this.id(),this.att())}
			else {console.log(logmsg ? logmsg : ""," JSON FORMAT IS INVALID");}  
			}
		}
	this.post= function(callback){
		$.ajax({
			type: 'POST',
			data: this.json,
			//url: '/data'
			url: '/'+type
			})
		.done(function (jsonReply) { callback(jsonReply)});
		}
	}

			
console.log("MODULE LOADED: jsondata.js")
