const AWS = require("aws-sdk");
const awsRegion = "us-east-1";
​
var https = require('https');
var querystring = require('querystring');
​
​
exports.handler = function(event,context, callback) {
    
    AWS.config.update({ region: awsRegion });
    
    //Write out the incoming payloads to Logs
    console.log("RAW WEBHOOK FOR " + event.detail.event + " event: " + JSON.stringify(event));
    console.log("RAW WEBHOOK FOR " + event.detail.event + " context: " + JSON.stringify(context));
​
    if (event.detail.event == "incident.custom") {
    
        //Create the Slack Channel here - Use a Promise to Ensure we don't update the Incident Record until compelte
        let createSlackChannelPromise = new Promise(function(resolve,reject) {
            
            var slack_channel_name; 
            var slack_key  = "xoxp-353738083440-353889871889-881883519648-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
            slack_channel_name = "inc-pagerduty-" + event.detail.incident.id.toLowerCase();
​
            var post_data = querystring.stringify({
                  'token' : slack_key,
                  'name': slack_channel_name,
                  'validate': true
              });
            
            const options = {
              host: 'slack.com',
              port: '443',
              path: '/api/channels.create',
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Content-Length': Buffer.byteLength(post_data)
              }
            };
            
            //Run the Request:
            const req = https.request(options, (res) => {
​
                console.log(`statusCode: ${res.statusCode}`)
                
                res.on('data', function (chunk) {
                      console.log('Response: ' + chunk);
                      resolve(slack_channel_name);
                })
            })
                
            req.on('error', (error) => {
                console.error(error)
            })
            
            req.write(post_data)
            req.end()
​
            });
        
        //Once the Channel is created then write back to the PD Incident Record
        createSlackChannelPromise.then(function(fromResolve) {
    
            //You MUST already have a placeholder for a CONF URL in place in order to add this on this fly:
            
            console.log('Channel Created: ' + fromResolve);
            
            const data = JSON.stringify({
                "incidents": [{
                    "id": event.detail.incident.id,
                    "type": "incident_reference",
                    "metadata":
                    {
                        "conference_url": fromResolve,
                    }
                }]
            })
            
            
            const options = {
                hostname: 'api.pagerduty.com',
                port: 443,
                path: `/incidents`,
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': data.length,
                  'From': 'tchinchen@pagerduty.com',
                  'Authorization': 'Token token=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                  'Accept': 'application/vnd.pagerduty+json;version=2'
                }
              }
            
            const req = https.request(options, (res) => {
                console.log(`statusCode: ${res.statusCode}`)
            
                res.on('data', (d) => {
                  process.stdout.write(d)
                })
            })
            
            req.on('error', (error) => {
            console.error(error)
            })
            
            req.write(data)
            req.end()
            
            
            
        }).catch(function(fromReject) {
            console.log(fromReject);
        });
        
​
    }
};
