/***************************************************************************************************************
control		container element holding the control buttons
element		container element that holds the data table
jsonData	contains tables with column headers and table data
			var jsonData = {} ;
			jsonData.columns = ["col1","col2","col3","col4","col5"] ;
			jsonData.table = [['A1','A2','A3','A4','A5'],['B1','B2','B3','B4','B5'],['C1','C2','C3','C4','C5']];
****************************************************************************************************************/

/***************************************************INCLUDE******************************************************
	link(rel='stylesheet', href='//cdn.datatables.net/1.10.9/css/jquery.dataTables.css')
	script(src='//cdn.datatables.net/1.10.9/js/jquery.dataTables.min.js')
	script(src='//cdn.datatables.net/1.10.9/js/dataTables.bootstrap.min.js')
	link(rel='stylesheet', href="//cdnjs.cloudflare.com/ajax/libs/select2/4.0.0/css/select2.min.css")
	link(rel='stylesheet', href='/stylesheets/select2-bootstrap.css')
	script(src="//cdnjs.cloudflare.com/ajax/libs/select2/4.0.0/js/select2.min.js")
****************************************************************************************************************/

function dynDatatables(){
	var selfTable = this ; // For reference reasons
	
	/////////////////////////////////////////////////////////////////////////////////////
	/////// INIT
	/////////////////////////////////////////////////////////////////////////////////////
	this.init = function(control,element,jsonData){
		var data;
		var colHeaders;
		var table;
		var tableID = element+"-tableID";
		var controlID = control+"-toggleID";  //table-toggle
		var toggleButtonID = control+"-toggleButtonID";
		
		//REMOVE OLD CHILD ELEMENTS
		selfTable.table = null;
		selfTable.colHeaders = null;
		var myNode = document.getElementById(control);
		while (myNode.firstChild) {
		    myNode.removeChild(myNode.firstChild);
		}
		myNode = document.getElementById(element);
		while (myNode.firstChild) {
		    myNode.removeChild(myNode.firstChild);
		}
		//SETUP OBSERVER FOR DOM
		// select the target node
		var target = document.querySelector('#'+control);
		// create an observer instance
		var observer = new MutationObserver(function(mutations) {
		  mutations.forEach(function(mutation) {
			//console.log("\nMUTATION:");
			for (var i=0; i< mutation.addedNodes.length ; i++){
				if (mutation.addedNodes[i].nodeType != 1) {continue;}// only fire for Element types
				//console.log(mutation.addedNodes[i].getAttribute("class"));
				//console.log(mutation.addedNodes[i].getAttribute("id"));
				if (mutation.addedNodes[i].getAttribute("class") == "reload") {  //This is the last element added. Attach event listeners
					$('button.toggle-vis').on( 'click', function (e) {
						e.preventDefault();
						// Get the column API object
						console.log("Clicked");
						var column = table.column( $(this).attr('data-column') );
						column.visible(!column.visible());
						if (column.visible()) $(this).css( "color", "black" )					
						if (!column.visible()) $(this).css( "color", "red" )			
						} );
					$('button.reload').on( 'click', function (e) {
						e.preventDefault();
						console.log("reload Clicked");
						table.clear().draw();
						});
					// FINAL EVENT LOADER ADDED DISCONNET OBSERVER
					observer.disconnect();
					}
				
				}
		  });    
		});
		// configuration of the observer:
		var config = { attributes: true, subtree: true, childList: true, characterData: true };
		// pass in the target node, as well as the observer options
		observer.observe(target, config);		
	
		// FILL DATA
		if (!jsonData) { $('#'+control).append($("<h1>No Table Received!</h1>"));return;}
		if (jsonData.columns.length == 0 ) { $('#'+control).append($("<h1>No Rows in Table!</h1>"));return;}
		if (jsonData.table.length == 0 ) { $('#'+control).append($("<h1>No Columns in Table!</h1>"));return;}

		data = jsonData.table;
		//DEBUG
		//console.log(data);
		colHeaders = jsonData.columns;			
		// CREATE HTML HOLDER sqlDataTable
		$('#'+control).append($("<div id='"+controlID+"'>Toggle columns:</div>"));
		$('#'+element).append($('<table id="'+tableID+'" class="display table table-striped table-bordered" cellspacing="0" width="100%">'));
		$('#'+tableID).append($('<thead></thead>'));
		$('#'+tableID).append($('<tfoot></tfoot>'));
		$('#'+tableID+' > thead:nth-child(1)').append($('<tr></tr>'));
		$('#'+tableID+' > tfoot:nth-child(2)').append($('<tr></tr>'));
		for (var i = 0; i<colHeaders.length ; i++) {
			$('#'+controlID).append("- <button class='toggle-vis btn btn-default btn-xs' id='"+toggleButtonID+i+"' data-column='"+i+"'>"+colHeaders[i]+'</button> ');
			$('#'+tableID+' > thead:nth-child(1) > tr:nth-child(1)').append($('<th>'+colHeaders[i]+'</th>'));
			$('#'+tableID+' > tfoot:nth-child(2) > tr:nth-child(1)').append($('<th>'+colHeaders[i]+'</th>'));
			};
		$('#'+controlID).append("<button style='visibility:hidden;' class='reload' id='"+toggleButtonID+"reload' data-column='"+i+"'>Reload</button> ");
		$('#'+tableID+' tfoot th').each( function () {
			var title = $('#'+tableID+' thead th').eq( $(this).index() ).text();
			$(this).html( '<input style="width:100%" type="text" placeholder="Search '+title+'" />' );
			});
		// CREATE EASY TABLE
		table = $('#'+tableID).DataTable();	
		// ENABLE Click function
		//$('#'+tableID+' tbody').on( 'click', 'tr', function () {
		// 	clickFn(table,table.row( this ).index(),this)
		//} );
		
		// DRAW TABLE
		table.draw();
		// REPLACE NEW LINES WITH <BR>
		for(x=0;x<data.length;x++){
			for(y=0;y<data[x].length;y++){
				data[x][y] = String(data[x][y]).replace(/\n/g,"<BR>");
				}}
		// ADD ROWS
		table.rows.add(data).draw();
		// APPLY Search
		table.columns().every(function(){
			var that = this;
			$( 'input', this.footer() ).on( 'keyup change', function () {
					that
						.search( this.value )
						.draw();
				});
			});
		selfTable.table = table;
		selfTable.colHeaders = colHeaders;
		//});
		}
	/////////////////////////////////////////////////////////////////////////////////////
	/////// GET TABLE WITH CALLBACK
	/////////////////////////////////////////////////////////////////////////////////////
	this.get = function(callback){
		var x = 0;
		function fnCheckTable(){
			if (selfTable.table){
				callback(selfTable.table);
				clearInterval(refreshIntervalId);
				}
			}
		var refreshIntervalId = setInterval(fnCheckTable, 100);
		}
	}
console.log("MODULE LOADED: dynDatatables.js")
