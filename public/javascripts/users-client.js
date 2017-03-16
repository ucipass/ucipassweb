var curModalRow = [];
var mainTable = new dynDatatables();

function read_db(isNewTable){
	var ioData = new JSONData(username,"users",{cmd:"user_list"});
	ioData.post(function(json){
		function getUserTable(){
			var s=['<user>'];
			for( var i=0; i<json.data.attributes.data.table.length; i++ ){ s.push(json.data.attributes.data.table[i][0]); }
			return s;
			console.log(s);
			}
		if (isNewTable){
			mainTable.init('container1','container2',json.data.attributes.data);	
			}
		else{
			mainTable.table.clear().draw();
			mainTable.table.rows.add(json.data.attributes.data.table);
			mainTable.table.draw();		
			}
		fnSelectFill($('#select-user-del'),getUserTable());
		fnSelectFill($('#select-user-pwd'),getUserTable());
		});
	}
function fnSelectFill(element,data){
	while (element[0].firstChild) {	element[0].removeChild(element[0].firstChild);} // REMOVE ALL CHILD OF ELEMENT
	var selecttable = []
	for(var x=0; x< data.length ; x++){
		if (data[x].constructor === Array){selecttable.push({id: data[x][0], text: data[x][0]});}
		else {selecttable.push({id: data[x], text: data[x]});}
		}
	element.select2({	data: selecttable	});
	}

function add_user(user,pwd){
	var ioData = new JSONData(username,"users",{cmd:"user_add",id:user,password:pwd});
	ioData.post(function(json){console.log(json);read_db(0);});
	}

function del_user(user){
	var ioData = new JSONData(username,"users",{cmd:"user_del",id:user});
	ioData.post(function(json){console.log(json);read_db(0);});
	}

function pwd_user(user,pwd){
	var ioData = new JSONData(username,"users",{cmd:"user_pwd",id:user,password:pwd});
	ioData.post(function(json){console.log(json)});
	}
	
// Create the filter fields on filter form
$( document ).ready(function() {
	console.log( "ready!" );
	// FILL THE SELECT FIELDS (DB,TABLES, LIMIT) THEN CREATE TABLE
	read_db(true);
	// EVENT HANDLING
	$('#button-modal-add-user').on('click', function (e) {
		e.preventDefault();
		$('#modal-add-user').modal('toggle');
		});
	$('#button-modal-add-user-clo').on('click', function (e) {
		e.preventDefault();
		$('#modal-add-user').modal('toggle');
		});
	$('#button-modal-add-user-add').on('click', function (e) {
		e.preventDefault();
		console.log("Add User!")
		if( $('#inp-add-pwd1').val() == $('#inp-add-pwd2').val() ) {
			add_user($('#inp-add-user').val(),$('#inp-add-pwd1').val());
			$('#modal-add-user').modal('toggle');
			}
		else {
			alert("passwords don't match");
			}
		});

	$('#button-modal-del-user').on('click', function (e) {
		e.preventDefault();
		$('#modal-del-user').modal('toggle');
		});
	$('#button-modal-del-user-clo').on('click', function (e) {
		e.preventDefault();
		$('#modal-del-user').modal('toggle');
		});
	$('#button-modal-del-user-del').on('click', function (e) {
		e.preventDefault();
		$('#modal-del-user').modal('toggle');
		console.log("Delete User!")
		del_user($('#select-user-del').val());
		});

	$('#button-modal-pwd-user').on('click', function (e) {
		e.preventDefault();
		$('#modal-pwd-user').modal('toggle');
		});
	$('#button-modal-pwd-user-clo').on('click', function (e) {
		e.preventDefault();
		$('#modal-pwd-user').modal('toggle');
		});
	$('#button-modal-pwd-user-pwd').on('click', function (e) {
		e.preventDefault();
		console.log("Change Password of User!")
		if( $('#inp-pwd-pwd1').val() == $('#inp-pwd-pwd2').val() ) {
			pwd_user(  $('#select-user-pwd').val()  ,  $('#inp-pwd-pwd1').val());
			$('#modal-pwd-user').modal('toggle');
			}
		else {
			alert("passwords don't match");
			}
		
		
		
		
		});
	
});
