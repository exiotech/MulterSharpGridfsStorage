import ObjectId from 'bson-objectid'
import sharp from 'sharp'

// Types
import {
    StorageEngine,
} from 'multer'
import {
    GridFSBucket,
    GridFSBucketOpenUploadStreamOptions,
    ObjectID,
} from 'mongodb'
import {
    Sharp,
} from 'sharp'


type ExpressRequest = Parameters<StorageEngine['_handleFile']>[0]
type ExpressFile = Parameters<StorageEngine['_handleFile']>[1]

export interface MulterSharpGridFsOptions {
    /**GridFsBucket or function which returnes GridFSBucket */
    gridFSBucket: ((req: ExpressRequest, file: ExpressFile, cb: (error?: any, bucket?: GridFSBucket) => void) => void) | GridFSBucket
    /**
     * Function which returnes Sharp instances for uploaded images, (each instance must be new, not cloned, because input stream is shared between cloned instances
     * @default sharp() - new sharp instance
     */
    sharpStream?(req: ExpressRequest, file: ExpressFile, cb: (error?: any, sharp?: Sharp) => void): void
    /**
     * GridFsBucket upload stream options
     * @default undefined - See openUploadStreamWithId options - http://mongodb.github.io/node-mongodb-native/3.6/api/GridFSBucket.html#openUploadStreamWithId
     */
    uploadOptions?(req: ExpressRequest, file: ExpressFile, cb: (error?: any, uploadOptions?: GridFSBucketOpenUploadStreamOptions) => void): void
    /**
     * Filename to use to upload file to GridFs
     * @default file.orginalname
     */
    uploadFilename?(req: ExpressRequest, file: ExpressFile, cb: (error?: any, uploadFilename?: string) => void): void
    /**
     * Id to store file with
     * @default - new ObjectId()
     */
    generateId?(req: ExpressRequest, file: ExpressFile, cb: (error?: any, generateId?: string | ObjectID) => void): void
}

export class MulterSharpGridFs implements StorageEngine {
    protected gridFSBucket(req: any, file: any, cb: any) { }
    protected sharpStream(req: any, file: any, cb: any) {
        cb(null, sharp())
    }
    protected uploadOptions(req: any, file: any, cb: any) {
        cb(null, undefined)
    }
    protected uploadFilename(req: any, file: any, cb: any) {
        cb(null, file.originalname)
    }
    protected generateId(req: any, file: any, cb: any) {
        cb(null, new ObjectId())
    }
    protected GridFSStreamMap = new Map()

    constructor(opts: MulterSharpGridFsOptions) {
        if (!(opts.gridFSBucket instanceof Object)) {
            throw new Error('opts.gridFSBucket is required, and must be a GridFSBucket instance or function returning GridFSBucket instance')
        }
        const that = this as any

        if (typeof opts.gridFSBucket === 'function') {
            that.gridFSBucket = opts.gridFSBucket
        } else {
            that.gridFSBucket = (req: any, file: any, cb: any) => cb(null, opts.gridFSBucket)
        }

        if (typeof opts.sharpStream === 'function') {
            that.sharpStream = opts.sharpStream
        }

        if (typeof opts.uploadOptions === 'function') {
            that.uploadOptions = opts.uploadOptions
        }

        if (typeof opts.uploadFilename === 'function') {
            that.uploadFilename = opts.uploadFilename
        }

        if (typeof opts.generateId === 'function') {
            that.generateId = opts.generateId
        }
    }

    _handleFile(req: any, file: any, cb: any) {
        this.gridFSBucket(req, file, (err: any, gridFSBucket: any) => {
            if (err) return cb(err)

            this.sharpStream(req, file, (err: any, sharpStream: any) => {
                if (err) return cb(err)
                if (!(sharpStream instanceof Object)) return cb(new Error('sharpStream must be instance of Object, preciesly returned by sharp()...() calls chain'))

                this.uploadOptions(req, file, (err: any, uploadOptions: any) => {
                    if (err) return cb(err)

                    this.uploadFilename(req, file, (err: any, uploadFilename: any) => {
                        if (err) return cb(err)
                        uploadFilename = uploadFilename ? uploadFilename + '' : file.originalname

                        this.generateId(req, file, (err: any, id: any) => {
                            if (err) return cb(err)
                            file.gridFSId = id
                            file.filename = uploadFilename
                            file.gridFSBucket = gridFSBucket

                            try {
                                const gridFSStream = gridFSBucket.openUploadStreamWithId(id, uploadFilename, uploadOptions)
                                this.GridFSStreamMap.set(req, gridFSStream)

                                sharpStream.on('error', (err: any) => cb(err))
                                gridFSStream.on('error', (err: any) => cb(err))
                                gridFSStream.on('finish', (file: any) => {
                                    this.GridFSStreamMap.delete(req)

                                    cb(null, {
                                        gridFSFile: file
                                    })
                                })

                                file.stream.pipe(sharpStream)
                                sharpStream.pipe(gridFSStream)
                            } catch (err) {
                                cb(err)
                            }
                        })
                    })
                })
            })
        })
    }

    async _removeFile(req: any, file: any, cb: any) {
        const gridFSStream = this.GridFSStreamMap.get(req)
        if (gridFSStream) {
            try {
                await gridFSStream.abort()
            } catch { } finally {
                this.GridFSStreamMap.delete(req)
                return cb(null, true)
            }
        }

        cb(null, true)
    }
}