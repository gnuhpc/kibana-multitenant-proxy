/**
 *
 * Created by huangpengcheng on 2016/6/22 0022.
 */
var config = require("./config.json");
var hoxy = require('hoxy');
var port=config.port;
var refreshPort=config.refreshPort;
var kibanaServer=config.kibanaServer;
var chkTimeRange=config.chkTimeRange;
var proxy = hoxy.createServer({
    reverse: kibanaServer,
});
var totalNum=config.totalNum;
var es_Server=config.es_Server;
var es_UserInfoUrl=config.es_UserInfoUrl;

var dataMask=config.dataMask;
var dataMaskConfig=config.dataMaskConfig;

var arrUser=[];
var arrIndexName=[];
var refreshFlag;
var refreshDate;
var maxDays;

var _MS_PER_DAY = 1000 * 60 * 60 * 24;
// a and b are javascript Date objects
function dateDiffInDays(a, b) {
    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function syncGetMaxDay(indexName){
    //get how long time of index a can be used in query with sync way
    var request = require("sync-request");
    var strurl = es_Server+indexName+'/_count';
    var res = request('GET', strurl);
    var strResData;

    console.log('the url of count is '+strurl);

    var cntOfIndex;
    strResData=res.getBody().toString();


    console.log('start to get the maxDay ES can support');
    cntOfIndex=parseInt(JSON.parse(strResData)['count']);

    console.log('the count of this index is 'cntOfIndex);

    var strurl = es_Server+indexName+'/_search';

    var res = request('POST', strurl,{json:{'aggs':{'start':{'min':{'field':'@timestamp'}}}}});
    strResData=res.getBody().toString();


    var strStartTime=JSON.parse(strResData)['aggregations']['start']['value_as_string'];
    console.log('strStartTime is '+strStartTime);
    var startTime= new Date(Date.parse(strStartTime.substr(0,10)));
    console.log('startTime is '+startTime);

    var res = request('POST', strurl,{json:{'aggs':{'end':{'max':{'field':'@timestamp'}}}}});
    strResData=res.getBody().toString();


    var strEndTime=JSON.parse(strResData)['aggregations']['end']['value_as_string'];
    console.log('strEndTime is '+strEndTime);
    var endTime= new Date(Date.parse(strEndTime.substr(0,10)));
    console.log('endTime is '+endTime);

    var totalDay=dateDiffInDays(startTime,endTime);
    console.log("time range of this index is "+totalDay);

    maxDays=Math.floor(totalNum*totalDay/cntOfIndex)+1;
    console.log('the max days of '+indexName + ' is '+maxDays);

}

function checkUserInfo(user, indexName) {
    // check if user a can get index b.
    console.log('check userinfo');
    for(i=0;i<arrUser.length;i++) {

        if (arrUser[i]==user && indexName.indexOf(arrIndexName[i])==0){
            return true;
        }
        if (arrUser[i]==user && arrIndexName[i]=='root'){
            return true;
        }
        
    }
    return false;
}

function ifGetUserInfo() {
    // check need to get userinfo or not     
    var myDate= new Date();
    var curDate=myDate.getDate();

    if (typeof refreshFlag=='undefined'){
        refreshFlag=true;
        refreshDate=curDate;
        console.log('fisrt time to run on '+ refreshDate+ ' need to refresh');
    }
    if ( refreshDate!=curDate){
        refreshFlag=true;
        refreshDate=curDate;
        console.log('change day to  '+ refreshDate+ ' need to refresh');
    }
    if ( refreshFlag==true){
        console.log('It will get UserInfo ');
        syncGetUserInfo();
        refreshFlag=false;
    }
}

function syncGetUserInfo() {
    // get index that user can access
    var request = require("sync-request");
    var strurl = es_UserInfoUrl+'_search?q=user:*';
    console.log('get userinfo of all');
    var res = request('GET', strurl);
    var strResData;
    strResData=res.getBody().toString();

    var i;

    console.log('start to save userinfo one by one');
    for(i=0;i<JSON.parse(strResData)['hits']['hits'].length;i++) {
        arrUser.push(JSON.parse(strResData)['hits']['hits'][i]['_source']['user']);
        arrIndexName.push(JSON.parse(strResData)['hits']['hits'][i]['_source']['indexname']);

    }
    console.log('get userinfo end');

}

var http=require('http');
http.createServer(function (request,response) {
    syncGetUserInfo();
    var fs=require('fs');
    config=JSON.parse(fs.readFileSync('./config.json'));
            console.log(config);
    response.writeHead(200,{'Content-Type':'text-plain'});
    response.end('UserInfo and Config Refresh Success! \n');

}).listen(refreshPort);

proxy.intercept({
    phase: 'response',
    mineType: 'application/json',
    as: 'json',
}, function (req, resp, cycle){ 

    console.log('start to intercept response for data masking');

    var i;
    var j;
    var k;

    var indexToMask;

    var fieldToMask;
    var strRegForMask;
    var regForMask;
    var maskTo;

    if (dataMask=='true'){

        if ('responses' in resp._data.source._obj && resp._data.source._obj.responses[0].hits.hits.length>0){
            console.log('response have data ');
    
            indexToMask=resp._data.source._obj.responses[0].hits.hits[0]._index;           
            console.log('index in responses is '+indexToMask);
    
            k=0;
            for (var k in dataMaskConfig){
                if (indexToMask.indexOf(dataMaskConfig[k].indexPrefix)==0){
                    console.log('the index need to mask');
                    j=0;
                    for (var j in dataMaskConfig[k].maskFields){
                        fieldToMask=dataMaskConfig[k].maskFields[j].maskField;
                        console.log('fieldToMask is '+fieldToMask);
                        strRegForMask=dataMaskConfig[k].maskFields[j].maskReg;
                        regForMask=eval(strRegForMask);
                        console.log('regForMask is '+strRegForMask);
                        maskTo=dataMaskConfig[k].maskFields[j].maskValue;
                        console.log('maskTo is '+maskTo);
                    
                        i=0;
                        for (var i in resp._data.source._obj.responses[0].hits.hits)
                        {
                            valueToMask=resp._data.source._obj.responses[0].hits.hits[i]._source[fieldToMask];
                            var maskRes = valueToMask.replace(regForMask, maskTo);
                            resp._data.source._obj.responses[0].hits.hits[i]._source[fieldToMask]=maskRes;
                    
                        }
                    }
                    break;
                }

            }

        }

    }

    console.log('data masking is end');

});

proxy.intercept({
    phase: 'request',
    method: 'POST',
    as: 'string',
}, function (req, resp, cycle) {
    var requrl = req.url,
        requser = req._data['headers']['remote_user'],
        indexname;

    ifGetUserInfo(); 

    if (requrl.indexOf('_msearch') != -1) {
        reqparams = req.string.split('\n');
        console.log('start to intercept request');
        indexname = JSON.parse(reqparams[0])['index'];
        console.log('request url is: ' + requrl);

        if (indexname instanceof  Array) {
            indexname = indexname[0];
        }
        console.log('index name is :' + indexname);
        console.log('request users:' + requser);

        if ( checkUserInfo(requser,indexname)== false){
            req.string = req.string.replace(indexname,'null');
            console.log(indexname+ ' has been changed to null');
        }
        else {
            console.log(indexname+ ' is ok , '+requser+' can access it');
            if ( chkTimeRange== 'true'){
                console.log(indexname+ ' need to check time range');
                
                post_time = JSON.parse(reqparams[1])['query']['filtered']['filter']['bool']['must'][0]['range']['@timestamp'];
                starttime =  post_time.gte;
                endtime =  post_time.lte;
        
                console.log("Start Time :" + new Date(starttime) + ',' + starttime);
                console.log("End Time :" + new Date(endtime)+','+endtime);
                console.log("Time Diff in days:" + Math.floor((endtime-starttime)/_MS_PER_DAY));                        
                
                syncGetMaxDay(indexname);
                console.log('max is ' + maxDays);
                if (Math.floor((endtime - starttime) / _MS_PER_DAY) > maxDays) {
                        console.log("Search Range is too long, Change its start:" + (endtime - maxDays * _MS_PER_DAY).toString());
                        req.string = req.string.replace(starttime.toString(), (endtime - maxDays * _MS_PER_DAY).toString());
                        console.log("Request String has been modified: " + req.string);
                }
            }
        }
        console.log('main request end');
    }
});

proxy.listen(port, function () {
    console.log('The proxy is listening on port ' + port + '.');
});