// @ts-nocheck

// const assert = require('assert');
// const fs = require('fs');
// const mongodb = require('mongodb');

// const uri = 'mongodb+srv://root2:rroot2@cluster0.6zbkq.mongodb.net/million-pieces?retryWrites=true&w=majority';
// const dbName = 'test';

// const client = new mongodb.MongoClient(uri);

// client.connect(function (error) {
//     assert.ifError(error);

//     const db = client.db(dbName);

//     var bucket = new mongodb.GridFSBucket(db);

//     const fileStream = fs.createReadStream('./tmp/Airbus-Spot6-50cm-St-Benoit-du-Lac-Quebec-2014-09-04.tif')
//     // const fileStream = fs.createReadStream('./tmp/20210226_004608.jpg')
//     const gridFsStream = bucket.openUploadStream('meistersinger.tif')
//     fileStream.
//         pipe(gridFsStream)

//     gridFsStream.
//         on('error', function (error) {
//             assert.ifError(error);
//         }).
//         on('finish', function () {
//             console.log('done!');
//             process.exit(0);
//         })
//         .on('close', () => {
//             console.log('close')
//         })
//         .on('drain', () => {
//             console.log('drain')
//         })
//         .on('close', () => {
//             console.log('close')
//         })

//         console.log(gridFsStream.writableHighWaterMark)
//     setTimeout(async () => {
//         try {
//             // const p = gridFsStream.end()
//             console.log(gridFsStream.writableEnded)
//             await gridFsStream.abort()
//             console.log(p)
//         } catch (err) {
//             console.log('err')
//             console.log(err)
//         }
//     }, 1000)
// });


var http = require('http'),
    inspect = require('util').inspect;

import Busboy from 'busboy'
import sharp from 'sharp'

http.createServer(function (req, res) {
    if (req.method === 'POST') {
        var busboy = new Busboy({
            headers: req.headers,
            limits: {
                parts: 2,
                files: 1,
                fileSize: 2 * 1000 * 1000,
            }
        });
        busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
            console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
            console.log(file.truncated)
            file.on('data', function (data) {
                console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
            });
            file.on('end', function () {
                if(file.truncated) {
                    console.log('truncatedabbbbbbbbbbbaaaaaaaaaaaaa')
                }
                console.log('File [' + fieldname + '] Finished');
            });
            file.on('limit', () => {
                console.log(file.truncated)
                console.log('truncatedabbbbbbbbbbb')
                if(file.truncated) {
                }
                console.log('limit')
            })
        });
        busboy.on('field', function (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            console.log('Field [' + fieldname + ']: value: ' + inspect(val));
        });
        busboy.on('finish', function (fieldname, file) {
            console.log(fieldname)
            console.log('Done parsing form!');
            res.writeHead(303, { Connection: 'close', Location: '/' });
            res.end();
        });
        busboy.on('filesLimit', () => {
            console.log('files limit')
        })
        req.pipe(busboy);
    } else if (req.method === 'GET') {
        res.writeHead(200, { Connection: 'close' });
        res.end('<html><head></head><body>\
               <form method="POST" enctype="multipart/form-data">\
               <input type="file" name="filefield333"><br />\
               <input type="file" name="filefield2222"><br />\
               <input type="file" name="filefield"><br />\
                <input type="text" name="textfield"><br />\
                <input type="submit">\
              </form>\
            </body></html>');
    }
}).listen(8000, function () {
    console.log('Listening for requests');
});