# multer-sharp-gridfs-storage
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