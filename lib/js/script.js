var _socket;
var _state = "not connected";

var game = {
    state: "",
    elapsed: 0,
    game_id: 0
};

var user = {
    connected: false
};

var goal = 2,
    nextGoal = goal;

/* LOADING
-------------*/
var loaderContainer = jQuery('<div/>', {
    id:     'loaderContainer',
    style:  "position: absolute;"+
            "top: 0; right: 0; bottom: 0; left: 0;"+
            "z-index: 100;"
}).appendTo('body');

var loaderSegment = jQuery('<div/>', {
    class:  'ui segment',
    style:  'height: 100%; opacity: 0.7;'
}).appendTo(loaderContainer);

var loaderDimmer = jQuery('<div/>', {
    class:  'ui active dimmer'
}).appendTo(loaderSegment);

var loadeText = jQuery('<div/>', {
    id:     'loaderText',
    class:  'ui text loader',
    text:   'Connecting'
}).appendTo(loaderDimmer);

/* SOCKET.IO
-------------*/
_socket = io('https://gs.bustabit.com');
_socket.on('connect_failed', function() {
    console.error((_state=="reconnection"?'Reconnection':'Connection')+' to Bustabit Failed');
    $("#loaderText").text("Connection failed...");
    $('#loaderContainer').css('display', '');
});
_socket.on('connect', function(data) {
    console.info((_state=="reconnection"?'Reconnected':'Connected')+' to Bustabit');
    _state = "connected";
    $("#loaderText").text("Connected");
    $('#loaderContainer').css('display', 'none');
    $("#goal").text(parseFloat(goal).format(2,'.',',')+"x");
    $("#goalInput").val(goal);
    
    _socket.emit('join', {
        ott: null,
        api_version: 1
    }, function(err, data) {
        if (err) console.error('[ERROR] join:', err);
        else{
            game = {
                state: data.state,
                elapsed: data.elapsed,
                game_id: data.game_id
            };
            updateGame();
        }
    });
});

_socket.on("game_starting", function(data) {
    if(nextGoal != "" && $.isNumeric(nextGoal)){
        goal = nextGoal;
        $("#goal").text(parseFloat(goal).format(2,'.',',')+"x");
    }else{
        $("#goalInput").val("1");
        nextGoal = $("#goalInput").val();
        goal = $("#goalInput").val();
        $("#goal").text(parseFloat(goal).format(2,'.',',')+"x");
    }
    game = {
        state: "STARTING",
        elapsed: -1,
        game_id: data.game_id
    }
    updateGame();
});

_socket.on("game_started", function() {
    game = {
        state: "IN_PROGRESS",
        elapsed: 0,
        game_id: game.game_id
    };
    updateGame();
});

_socket.on("game_crash", function(data) {
    game = {
        state: "ENDED",
        elapsed: data.elapsed,
        game_id: game.game_id,
        busted: data.game_crash
    };
    updateGame();
});

_socket.on("game_tick", function(data) {
    game = {
        state: "IN_PROGRESS",
        elapsed: data,
        game_id: game.game_id
    };
    updateGame();
});

_socket.on('disconnect', function () {
    console.error('Disconnected from Bustabit, trying to reconnect...');
    _state = "reconnection";
    $("#loaderText").text("Reconnection");
    $('#loaderContainer').css('display', '');
});

/* GAMEUPDATE
-------------*/
function updateGame() {
    if(game.state == "STARTING") {
        $("#left").css("color", "#BDC3C7");
        $("#right").css("color", "#000");
        $("#midBar.result").css("border-bottom", "9px solid #BDC3C7");
        $("#midBar.result").css("width", "0px");
        $("#gameBust").text("Game starting...");
    }else if(game.state == "ENDED") {
        if(((Math.floor(100 * Math.pow(Math.E, 0.00006 * game.elapsed)))/100) < goal){
            $("#left").css("color", "#C0392B");
            $("#midBar.result").css("border-bottom", "9px solid #C0392B");
        }
        if(game.busted) $("#gameBust").text("Game busted at " + ((game.busted)/100).format(2,'.',',') + "x");
        else $("#gameBust").text("Game busted at " + ((Math.floor(100 * Math.pow(Math.E, 0.00006 * game.elapsed)))/100).format(2,'.',',') + "x");
    }else if(game.state == "IN_PROGRESS") {
        $("#left").css("color", "#BDC3C7");
        $("#right").css("color", "#000");
        $("#midBar.result").css("border-bottom", "9px solid #BDC3C7");
        var bust = ((Math.floor(100 * Math.pow(Math.E, 0.00006 * game.elapsed)))/100);
        var size = (((270*(bust-1))/goal-1) + ((((270*1)/goal)/270)*((270*(bust))/goal)));
        if(size > 270) size = 270;
        $("#midBar.result").css("width", size+"px");
        $("#gameBust").text(bust.format(2,'.',',') + "x");
        if(bust >= goal){
            $("#left").css("color", "#27AE60");
            $("#right").css("color", "#27AE60");
            $("#midBar.result").css("border-bottom", "9px solid #27AE60");
        }
    }
}

$('#goalInput').on('input', function() {
    if(!isNaN($("#goalInput").val()) && game.state != "STARTING") nextGoal = $("#goalInput").val();
    else if(!isNaN($("#goalInput").val()) && game.state == "STARTING"){
        nextGoal = $("#goalInput").val();
        goal = $("#goalInput").val();
        $("#goal").text(parseFloat(goal).format(2,'.',',')+"x");
    }else{
        $("#goalInput").val("1");
        nextGoal = $("#goalInput").val();
        goal = $("#goalInput").val();
        $("#goal").text(parseFloat(goal).format(2,'.',',')+"x");
    }
});
$('#goalInput').keyup(function(e){
    if(e.keyCode == 13) {
        $("#settingsModal").modal('hide');
    }
});

$("#betButton").click(function(){
    if(!user.connected){
        $("#loginModal").modal({
            closable: false
        });
        $("#loginModal").modal('show');
    }
});

$("#settingButton, #right, #goal").click(function(){
    if(!user.connected){
        $("#settingsModal").modal({
            //closable: false
        });
        $("#settingsModal").modal('show');
    }
});

$("#connectionButton").click(function(){
    if(!user.connected){
        var errors = 0;
        $("#usernameInput").parent().removeClass("error");
        $("#pwdInput").parent().removeClass("error");

        if($("#usernameInput").val() == ""){
            $("#usernameInput").parent().addClass("error");
            errors++;
        }
        if($("#pwdInput").val() == ""){
            $("#pwdInput").parent().addClass("error");
            errors++;
        }

        if(errors > 0) return;

        $("#loginModal").modal('hide');
        $("#loaderText").text("Connecting to bustabit...");
        $('#loaderContainer').css('display', '');

        $.ajax({
           type: "POST",
           url: "https://www.bustabit.com/login",
           data: $("#loginForm").serialize(), // serializes the form's elements.
           success: function(data){
                alert(data); // show response from the php script.
            }
        });

    }else{
        alert("Error: Already connected.");
    }
});

Number.prototype.format = function(c, d, t){
    var n = this, 
        c = isNaN(c = Math.abs(c)) ? 2 : c, 
        d = d == undefined ? "." : d, 
        t = t == undefined ? "," : t, 
        s = n < 0 ? "-" : "", 
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
        j = (j = i.length) > 3 ? j % 3 : 0;
   return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
 };