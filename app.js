var express = require("express");
var app = express();
var server = require("http").Server(app);

app.get("/",function(req, res){
    res.sendFile(__dirname + "/client/index.html");
});

app.get("/messO",function(req, res){
    res.sendFile(__dirname + "/client/messO.html");
});

app.get("/messOreferences",function(req, res){
    res.sendFile(__dirname + "/client/messOreferences.html");
});

app.get("/gameO",function(req, res){
    res.sendFile(__dirname + "/client/gameO.html");
});

app.use(express.static(__dirname + '/client'));

server.listen(8080);
console.log("Server Started.");

var sockets = {};
var players = {};

var Player = function(id){
    var self = {
        x: 250,
        y:250,
        id: id,
        up: false,
        down: false,
        left: false,
        right: false,
        speed: 5
    };
    self.updatePosition = function(){
        if(self.up){
            self.y -= self.speed;
        } else if(self.down){
            self.y += self.speed;
        } else if(self.left){
            self.x -= self.speed;
        } else if(self.right){
            self.x += self.speed;
        }
        if(self.x < 0){
            self.x = 0;
        } else if(self.x > 500){
            self.x = 500;
        } else if(self.y < 0){
            self.y = 0;
        } else if(self.y > 500){
            self.y = 500;
        }
    }
    return self;
}

var io = require("socket.io")(server, {});
io.sockets.on("connection", function(socket){
    socket.on("connected",function(data){
        console.log("Somebody has connected.");
        for(var i in sockets){
            var newSocket = sockets[i];
            if(newSocket.id == data.user){
                var randomName = getRandomName();
                socket.emit("server",{
                    message: "That name is already used. You will be assigned the name: " + randomName
                });
                data.user = randomName;
            }
        }
        socket.id = data.user;
        sockets[socket.id] = socket;
        for(var i in sockets){
            var newSocket = sockets[i];
            if(newSocket.id != socket.id){
                newSocket.emit("server",{
                    message: socket.id + " has connected."
                });
            }
        }
        socket.emit("name",{
            name: socket.id 
        });
    });
    var player = Player(socket.id);
    players[socket.id] = player;
    socket.on("sent", function(data){
        data.message = emojiFilter(data.message);
        for(var i in sockets){
            var newSocket = sockets[i];
            newSocket.emit("received",{
                sender: data.sender,
                message: data.message
            });
        }
    });
    socket.on("disconnect",function(){
        delete sockets[socket.id];
        delete players[socket.id];
        for(var i in sockets){
            var newSocket = sockets[i];
            if(newSocket.id != socket.id){
                newSocket.emit("server",{
                    message: socket.id + " has disconnected."
                });
            }
        }
    });
    socket.on("keyPress",function(data){
        if(data.input == "up"){
            player.up = data.state;
        } else if(data.input == "down"){
            player.down = data.state;
        } else if(data.input == "left"){
            player.left = data.state;
        } else if(data.input == "right"){
            player.right = data.state;
        }
    });
});

function getRandomName(){
    var name = "";
    var firstNames = ["Jeff","Toom","Tom","Bob","Bobby","Ben","Mike","Michael","Lucas","Alex"];
    var lastNames = ["isn't_my_name","Jones","William","Johnson","is_TRIGGERED","loves_video_games"," is_here","the_Great","the_Destroyer","Smith"];
    name += firstNames[Math.floor(Math.random()*firstNames.length)] + "_" + lastNames[Math.floor(Math.random()*lastNames.length)] + (Math.floor(Math.random()*9999)+1).toString();
    return name;
}

function emojiFilter(text){
    var emojis = [[":)","😀"],["E)","😁"],["X)LL","🤣"],["8D","😃"],["ED","😄"],["XD","😆"],["EP","😋"],["BP","😎"],["E3","😙"],["8)","🙂"]];
    for(var emoji in emojis){
        text = text.replace(("[" + emojis[emoji][0] + "]"), emojis[emoji][1]);
    }
    return text;
}

setInterval(function(){
    var positions = [];
    for(var i in players){
        var newPlayer = players[i];
        newPlayer.updatePosition();
        positions.push([newPlayer.id,{
            x: newPlayer.x,
            y: newPlayer.y
        }]);
        console.log(positions);
    }
    for(var i in sockets){
        var newSocket = sockets[i];
        newSocket.emit("positions",{positions});
    }
},10);