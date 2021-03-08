# multer-sharp-gridfs-storage
## BROKEN - DO NOT USE THIS PACKAGE :skull:
This Packge is currently **broken** due to some issues releated to owner's code,
and mainly due to **bugs** related to external packages:
- [**multer BUGS**](https://github.com/expressjs/multer/labels/bug)
- [**GridFS BUGS**](https://jira.mongodb.org/browse/NODE-3104?filter=-4&jql=issuetype%20%3D%20Bug%20AND%20status%20%3D%20Open%20AND%20text%20~%20%22gridfs%22%20order%20by%20created%20DESC)

**Do not use this package!!!**

## Description
This package is writen to buypass buffering of the **images** in memory
or on disk in the roadmap - **client->sharp->gridfs**.

## Usage
To initialize a storage, the only required argument is **GridFsBucket** instance
in constructor options:
```javascript
    const { MulterSharpGridFS } = require('multer-sharp-gridfs-storage')
    const storage = new MulterSharpGridFS({
        gridFSBucket
    })
```
When useing this storage, every uploaded **image** will be passed through **sharp()** instance and from there to **GridFs** with a single stream of data, without
buffering or storing in the middle.

For options details see **TSDocs**.