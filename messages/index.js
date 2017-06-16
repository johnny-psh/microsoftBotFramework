/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
https://aka.ms/abs-node-luis
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var path = require('path');
var request = require("request");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
bot.localePath(path.join(__dirname, './locale'));

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;
var busUrl = "http://datamall2.mytransport.sg/ltaodataservice/BusArrival?";
var ltaApiKey = "yaa/bnqhRlyVpkQkNnurGg==";

var generalReplies = [
    "Hello to you too!\nHow may I help you today?",
    "Hey there! What would you like me to do today?",
    "Hi!",
    "Wassup?",
    "Hello, how may I be of assistance?",
    "How's it going?",
    "How may I assist you today?",
    "Hiya! How can I help you today?"
];


// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })

.matches('Conversation.Greeting',(session, args) => {
    var rand = Math.floor(Math.random() * (generalReplies.length));
    session.send(generalReplies[rand]);
})

.matches('BusTiming.NextBus',(session, args) => {
    var busNum = builder.EntityRecognizer.findEntity(args.entities, 'BusServiceNum');
    var busStopNum = builder.EntityRecognizer.findEntity(args.entities, 'BusStopNum');

    if(busNum) {
        busNum = busNum.entity;
    } else {
        busNum = "69"; //Default fallback bus number
    }

    if(busStopNum) {
        busStopNum = busStopNum.entity;
    } else {
        busStopNum = "75239"; //Default fallback bus stop number
    }

}

request({headers: {'AccountKey': ltaApiKey}, 
uri:busUrl+"BusStopID="+busStopNum+"&ServiceNo="+busNum}, function(error, response, body){ 
    if(error){ 
        return console.log('Error:', error);
     } 
     
    if(response.statusCode !== 200){ 
         return console.log('Invalid Status Code Returned:', response.statusCode); 
        } 


    var obj = JSON.parse(body); 
    var busStopNum = obj.BusStopID; 
    var services = obj.Services; 

    var service = services[0];

if(service != null){ 
    var no = service.ServiceNo; 
    var inOp = service.Status; 
    
    if(inOp === "In Operation"){ 
        var nextBus = service.NextBus; 
        var estArr = nextBus.EstimatedArrival; 
        estArr ? true : false; 
        
        var subBus = service.SubsequentBus; 
        var subEstArr = subBus.EstimatedArrival; 
        subEstArr ? true : false; 
        
        var msgStart = "Bus "+no+" at bus stop "+busStopNum+" "; 
        
        if(estArr){ 
            var load = nextBus.Load;
            var feature = nextBus.Feature; 
            feature ? true : false; 
            
            if(feature){ 
                var featureText = " ("+feature+")"; 
            } 
                else { var featureText = ""; 
            } 
            
            var milli = Math.abs(new Date(estArr) - new Date()); 
            var diff = Math.floor((milli/1000)/60); 
            
            if(diff == "1" || diff == "0"){ 
                var msg = "is arriving"+featureText; 
            } else { 
                var msg = "will arrive in "+diff+" minutes"+featureText; 
            } 
        } else { 

        } 
        
        if(subEstArr){ 
            var subLoad = subBus.Load; 
            
            var subFeature = subBus.Feature; 
            subFeature ? true : false; 
            
            if(subFeature){ 
                var subFeatureText = " ("+subFeature+")"; 
            } else { 
                var subFeatureText = ""; 
            } 
            
            var subMilli = Math.abs(new Date(subEstArr) - new Date()); 
            var subDiff = Math.floor((subMilli/1000)/60); 
            
            if(estArr){ 
                if(subDiff == "1" || subDiff == "0"){ 
                    var subMsg = " and the subsequent bus in "+subDiff+" minute"+subFeatureText+".";
                 } else { 
                     var subMsg = " and the subsequent bus in "+subDiff+" minutes"+subFeatureText+"."; 
                    } } else { 
                        var msg = subDiff+" minutes "+subFeatureText+".";
                } } else { 
                    var subMsg = "."; 
            } 
            
            session.send(msgStart + msg + subMsg); 
        } else { 
            session.send("Bus "+no+" at bus stop "+busStopNum+" is currently not in service."); 
        } 
    } else { session.send("Bus "+busNum+" does not call at bus stop "+busStopNum+". Please check your details and try again."); 
} 

console.log(body); 
   }); 
})
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog('/', intents);    

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}

