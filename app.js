/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
//app.use('/', express.static(__dirname + '/public', {maxAge:3600000}));

 app.use('/', express.static(__dirname + '/public'));


var bodyParser = require('body-parser')

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }))

// parse application/json
app.use(bodyParser.json({limit: '50mb'}))

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function lookupAsynchDOBearerToken(workspace, dokey) {
        
    let config = getConfig(workspace);

    // Cloud
    console.log('Lookup Bearer Token from IAM (ASYNCH)')
    let options = {                
        url: IAM_URL,
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Basic Yng6Yng='
        },
        body: 'apikey='+config[dokey].apikey+'&grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey'
    };

    request.post(options, function (error, response, body){
        if (error || response.statusCode >= 400) {
            console.error('Error looking up token: ' + body.toString())
        } else {
            let object = JSON.parse(body);

            config[dokey].bearerToken =   object.access_token;
            config[dokey].bearerTokenTime = Date.now();
            console.log('Got Bearer Token from IAM')
        
        }
    });	
}

let IAM_URL = "https://iam.cloud.ibm.com/identity/token";
let IAM_TIMEOUT = 3600;

let credentials = null;
var fs = require('fs');
let contents = fs.readFileSync("credentials-us2.json", 'utf8');
credentials = JSON.parse(contents);

let bearerToken = null;
let bearerTokenTime = 0;
    

function lookupSynchDOBearerToken() {
    
    // Cloud
    let options = {                
        url: IAM_URL,
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Basic Yng6Yng='
        },
        body: 'apikey='+credentials.apikey+'&grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey'
    };
    let srequest = require('sync-request');

    let sres = srequest('POST', options.url, options);
    if (sres.statusCode >= 400)
        console.error('Error looking up token: ' + sres.getBody().toString())
    let object = JSON.parse(sres.getBody())
    
    bearerToken =   object.access_token;
    bearerTokenTime = Date.now();
    console.log('Got Bearer Token from IAM')
}

function getDOBearerToken() {
    if ( (bearerToken == null) ||
        (bearerTokenTime + 1000 * IAM_TIMEOUT < Date.now()) )
        lookupSynchDOBearerToken();

    return bearerToken;
}

router.put('/credentials', function(req, res) {
    //let scenario = req.query.scenario;
    credentials = req.body;
    res.status(200);
    res.end();
});

router.get('/deployments', function(req, res) {
            

    let options = {
        url: credentials.url + '/v4/deployments',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'bearer ' + getDOBearerToken(),
            'ML-Instance-ID': credentials.instance_id,
            'cache-control': 'no-cache'
        }
    };

    let request = require('request');
    
    request.get(options, function (error, response, body){
        if (error || response.statusCode >= 400) {
            console.error('Error getting deployments: ' + body.toString())
            res.json({});
        } else {
            let object = JSON.parse(body);

            res.json(object);
        
        }
    });	

});


router.get('/jobs', function(req, res) {
    let deployment_id = req.query.deployment_id;

    let options = {
        url: credentials.url + '/v4/deployment_jobs?deployment_id=' + deployment_id,
        headers: {
            'Accept': 'application/json',
            'Authorization': 'bearer ' + getDOBearerToken(),
            'ML-Instance-ID': credentials.instance_id,
            'cache-control': 'no-cache'
        }
    };

    let request = require('request');
    
    request.get(options, function (error, response, body){
        if (error || response.statusCode >= 400) {
            console.error('Error getting jobs: ' + body.toString())
            res.json({});
        } else {
            let object = JSON.parse(body);

            res.json(object);
        
        }
    });	

});


router.get('/jobs/:job_id', function(req, res) {
    let job_id = req.params.job_id;

    let options = {
        url: credentials.url + '/v4/deployment_jobs/' + job_id,
        headers: {
            'Accept': 'application/json',
            'Authorization': 'bearer ' + getDOBearerToken(),
            'ML-Instance-ID': credentials.instance_id,
            'cache-control': 'no-cache'
        }
    };

    let request = require('request');
    
    request.get(options, function (error, response, body){
        if (error || response.statusCode >= 400) {
            console.error('Error getting job: ' + body.toString())
            res.json({});
        } else {
            let object = JSON.parse(body);

            res.json(object);
        
        }
    });	

});

// from https://cloud.ibm.com/docs/cloud-object-storage/iam?topic=cloud-object-storage-hmac-signature#hmac-auth-header-generate-node
function getStuff(endpoint, accessKey, secretKey, bucket, objectKey, cb) {
    var stuff = "";

    const crypto = require('crypto');
    const moment = require('moment');
    const https = require('https');

    // please don't store credentials directly in code
    //const accessKey = process.env.COS_HMAC_ACCESS_KEY_ID;
    //const secretKey = process.env.COS_HMAC_SECRET_ACCESS_KEY;

    const httpMethod = 'GET';
    //const host = 's3.us.cloud-object-storage.appdomain.cloud';
    const host = endpoint.split('//')[1]
    const region = host.split('.')[1];
    //const endpoint = 'https://s3.us.cloud-object-storage.appdomain.cloud';
    //const bucket = ''; // add a '/' before the bucket name to list buckets
    //const objectKey = '';
    const requestParameters = '';

    // hashing and signing methods
    function hash(key, msg) {
        var hmac = crypto.createHmac('sha256', key);
        hmac.update(msg, 'utf8');
        return hmac.digest();
    }

    function hmacHex(key, msg) {
        var hmac = crypto.createHmac('sha256', key);
        hmac.update(msg, 'utf8');
        return hmac.digest('hex');
    }

    function hashHex(msg) {
        var hash = crypto.createHash('sha256');
        hash.update(msg);
        return hash.digest('hex');
    }

    // region is a wildcard value that takes the place of the AWS region value
    // as COS doesn't use the same conventions for regions, this parameter can accept any string
    function createSignatureKey(key, datestamp, region, service) {
        keyDate = hash(('AWS4' + key), datestamp);
        keyString = hash(keyDate, region);
        keyService = hash(keyString, service);
        keySigning = hash(keyService, 'aws4_request');
        return keySigning;
    }

    // assemble the standardized request
    var time = moment().utc();
    var timestamp = time.format('YYYYMMDDTHHmmss') + 'Z';
    var datestamp = time.format('YYYYMMDD');

    var standardizedResource = '/' + bucket + '/' + objectKey;
    var standardizedQuerystring = requestParameters;
    var standardizedHeaders = 'host:' + host + '\n' + 'x-amz-date:' + timestamp + '\n';
    var signedHeaders = 'host;x-amz-date';
    var payloadHash = hashHex('');

    var standardizedRequest = httpMethod + '\n' +
        standardizedResource + '\n' +
        standardizedQuerystring + '\n' +
        standardizedHeaders + '\n' +
        signedHeaders + '\n' +
        payloadHash;

    // assemble string-to-sign
    var hashingAlgorithm = 'AWS4-HMAC-SHA256';
    var credentialScope = datestamp + '/' + region + '/' + 's3' + '/' + 'aws4_request';
    var sts = hashingAlgorithm + '\n' +
        timestamp + '\n' +
        credentialScope + '\n' +
        hashHex(standardizedRequest);

    // generate the signature
    var signatureKey = createSignatureKey(secretKey, datestamp, region, 's3');
    var signature = hmacHex(signatureKey, sts);

    // assemble all elements into the 'authorization' header
    var v4authHeader = hashingAlgorithm + ' ' +
        'Credential=' + accessKey + '/' + credentialScope + ', ' +
        'SignedHeaders=' + signedHeaders + ', ' +
        'Signature=' + signature;

    // create and send the request
    var authHeaders = {
        'x-amz-date': timestamp, 
        'Authorization': v4authHeader
        //'x-amz-content-sha256': hashHex("")
    }
    // the 'requests' package autmatically adds the required 'host' header
    console.log(authHeaders);
    var requestUrl = endpoint + standardizedResource + standardizedQuerystring

    console.log(`\nSending ${httpMethod} request to IBM COS -----------------------`);
    console.log('Request URL = ' + requestUrl);

    var options = {
        //url: 'https://'+host+':443/'+standardizedResource + standardizedQuerystring,
        host: host,
        port: 443,
        path: standardizedResource + standardizedQuerystring,
        method: httpMethod,
        headers: authHeaders
    }
    
    let res = https.request(options, function (response) {
        console.log('\nResponse from IBM COS ----------------------------------');
        console.log(`Response code: ${response.statusCode}\n`);

        response.on('data', function (chunk) {
            console.log(chunk.toString());
            stuff = chunk.toString();
            cb(stuff)
        });
    });
    
    res.end();
}

router.get('/jobs/:job_id/:data_id', function(req, res) {
    let job_id = req.params.job_id;
    let data_id = req.params.data_id;

    let options = {
        url: credentials.url + '/v4/deployment_jobs/' + job_id,
        headers: {
            'Accept': 'application/json',
            'Authorization': 'bearer ' + getDOBearerToken(),
            'ML-Instance-ID': credentials.instance_id,
            'cache-control': 'no-cache'
        }
    };

    let request = require('request');
    
    request.get(options, function (error, response, body){
        if (error || response.statusCode >= 400) {
            console.error('Error getting job: ' + body.toString())
            res.json({});
        } else {
            let object = JSON.parse(body);
            for (r in object.entity.decision_optimization.input_data) {
                let data = object.entity.decision_optimization.input_data[r]
                if (data.id == data_id) {
                    let content = "";
                    let first = true
                    for (f in data.fields) {
                        if (!first)
                            content += ',';
                        content += data.fields[f]
                        first = false;
                    }
                    content += '\n';
                    for (v in data.values) {
                        first = true
                        let values = data.values[v];
                        for (i in values) {
                            if (!first)
                                content += ',';
                            content += values[i]
                            first = false;
                        }
                        content += '\n';
                    }
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.write(content);
                    res.end();
                    return;
                }
            }
            for (r in object.entity.decision_optimization.input_data_references) {
                let data = object.entity.decision_optimization.input_data_references[r]
                if (data.id == data_id && data.type=='s3') {
                    getStuff(data.connection.endpoint_url, 
                                        data.connection.access_key_id, 
                                        data.connection.secret_access_key,
                                        data.location.bucket, 
                                        data.location.path,
                                        function (content) {
                                            res.writeHead(200, {'Content-Type': 'text/plain'});
                                            res.write(content);
                                            res.end();
                                        });
                    return;
                }
            }
            for (r in object.entity.decision_optimization.output_data) {
                let data = object.entity.decision_optimization.output_data[r]
                if (data.id == data_id) {
                    let content = "";
                    let first = true
                    for (f in data.fields) {
                        if (!first)
                            content += ',';
                        content += data.fields[f]
                        first = false;
                    }
                    content += '\n';
                    for (v in data.values) {
                        first = true
                        let values = data.values[v];
                        for (i in values) {
                            if (!first)
                                content += ',';
                            content += values[i]
                            first = false;
                        }
                        content += '\n';
                    }
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.write(content);
                    res.end();
                    return;
                }
            }
            for (r in object.entity.decision_optimization.output_data_references) {
                let data = object.entity.decision_optimization.output_data_references[r]
                if (data.id == data_id && data.type=='s3') {
                    getStuff(data.connection.endpoint_url, 
                        data.connection.access_key_id, 
                        data.connection.secret_access_key,
                        data.location.bucket, 
                        data.location.path,
                        function (content) {
                            res.writeHead(200, {'Content-Type': 'text/plain'});
                            res.write(content);
                            res.end();
                        });
                    return;
                }
            }
            res.json({});
        
        }
    });	

});




// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);



// // get the app environment from Cloud Foundry
// var appEnv = cfenv.getAppEnv();

// // start server on the specified port and binding host
// app.listen(appEnv.port, '0.0.0.0', function() {
//   // print a message when the server starts listening
//   console.log("server starting on " + appEnv.url);
// });


// start server with credentials for https, etc
var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');

var w3credentials = {key: privateKey, cert: certificate};


// your express configuration here

var httpServer = http.createServer(app).listen(6004);
var httpServer = http.createServer(app).listen(8080);
var httpsServer = https.createServer(w3credentials, app).listen(8443);

