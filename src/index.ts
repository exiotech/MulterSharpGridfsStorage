import {
    ObjectId,
} from 'mongodb'
import sharp from 'sharp'

// Types
import {
    StorageEngine,
} from 'multer'
import {
    GridFSBucket,
    GridFSBucketOpenUploadStreamOptions
} from 'mongodb'
import {
    Sharp,
} from 'sharp'

// new GridFSBucket().openUploadStreamWithId().
type ExpressRequest = Parameters<StorageEngine['_handleFile']>[0]
type ExpressFile = Parameters<StorageEngine['_handleFile']>[1]

declare global {
    namespace Express {
        namespace Multer {
            interface File {
                /** 
                 * `MulterSharpGridfsStorage` only: Id of file in `GridFS`
                 * NOTE: This Field will be populated on file only if upload successfully started
                 */
                gridFSId?: ObjectId
                /** 
                 * `MulterSharpGridfsStorage` only: Name of file in `GridFS`
                 * NOTE: This Field will be populated on file only if upload successfully started
                 */
                gridFSFilename?: string
                /** 
                 * `MulterSharpGridfsStorage` only: Instance of `GridFSBucket`
                 * NOTE: This Field will be populated on file only if upload successfully started
                 */
                gridFSBucket?: GridFSBucket
                /**
                 * GridFS File information after upload
                 * NOTE: This Field will be populated on file only if upload successfully started
                 */
                gridFSFile?: any
            }
        }
    }
}

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
    generateId?(req: ExpressRequest, file: ExpressFile, cb: (error?: any, generateId?: string | ObjectId) => void): void
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
    protected abortcbMap = new Map()
    protected failedMap = new Map()

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
                            if (!ObjectId.isValid(id)) return cb(new Error(`Invalid Objectid: ${id}`))

                            id = typeof id === 'string' ? new ObjectId(id) : id
                            file.gridFSId = id
                            file.gridFSFilename = uploadFilename
                            file.gridFSBucket = gridFSBucket

                            try {
                                const gridFSStream = gridFSBucket.openUploadStreamWithId(id, uploadFilename, uploadOptions)
                                this.GridFSStreamMap.set(file, gridFSStream)

                                const abortcb = async () => {
                                    console.log('aborted-1')
                                    cb(new Error('ERR: Request Aborted. File upload will be stoped, and all changes will be removed'))
                                    console.log('aborted-2')
                                    await this.__removeFile(req, file, () => { })
                                    await this.__exhaustAbortcb(req, file)
                                }
                                this.abortcbMap.set(file, abortcb)


                                req.once('aborted', abortcb)
                                sharpStream.on('error', async (err: any) => {
                                    console.log('e443-1')
                                    cb(err)
                                    console.log('e443-2')
                                    await this.__removeFile(req, file, () => { })
                                    this.__exhaustAbortcb(req, file)
                                })
                                gridFSStream.on('error', async (err: any) => {
                                    console.log('e1228-1')
                                    cb(err)
                                    console.log('e1228-2')
                                    await this.__removeFile(req, file, () => { })
                                    this.__exhaustAbortcb(req, file)
                                })
                                gridFSStream.on('finish', (file: any) => {
                                    const isFailed = this.failedMap.get(file)
                                    this.failedMap.delete(file)
                                    if (isFailed) return console.log('finish failed')
                                    console.log('finish success')

                                    this.__exhaustAbortcb(req, file)

                                    this.GridFSStreamMap.delete(file)

                                    cb(null, {
                                        gridFSFile: file
                                    })
                                })

                                file.stream.pipe(sharpStream)
                                sharpStream.pipe(gridFSStream)
                                console.log('start stream')
                            } catch (err) {
                                cb(err)
                            }
                        })
                    })
                })
            })
        })
    }

    /**
     * This methods currently added only for StorageEngine specification complience
     * It`s not working due to the bug - https://github.com/expressjs/multer/issues/259
     */
    _removeFile(req: any, file: any, cb: any) {
        // this.__exhaustAbortcb(req, file)
        // this._removeFile(req, file, cb)
        cb(null, true)
    }

    /**
     * Here GridFSAbort has bug - it only stops operation of upload,
     * but not perform cleanup of database from already insterted chunks
     */
    private async __removeFile(req: any, file: any, cb: any) {
        console.log('__removeFile entered')
        const isFailed = this.failedMap.get(file)
        if (!isFailed) {
            console.log('is not failed before, must be removed')
            this.failedMap.set(file, true)
            try {
                const gridFSStream = this.GridFSStreamMap.get(file)
                this.GridFSStreamMap.delete(file)
                if (gridFSStream) {
                    try {
                        console.log('end upload stream-1')
                        await new Promise((res: any, rej: any) => gridFSStream.end((err: any) => {
                            console.log('jungle book')
                            if (err) return rej(err)
                            res()
                        }))
                        console.log('end upload stream-2')
                    } catch { }
                    try {
                        console.log('delete file-1')
                        await new Promise((res: any, rej: any) => file.gridFSBucket.delete(file.gridFSId, (err: any) => {
                            if (err) return rej(err)
                            res()
                        }))
                        console.log('delete file-2')
                    } catch { }

                    return cb(null, true)
                }
            } catch { }
        }

        cb(null, true)
    }

    private __exhaustAbortcb(req: any, file: any) {
        const abortcb = this.abortcbMap.get(file)
        if (abortcb) {
            try {
                req.off('aborted', abortcb)
                this.abortcbMap.delete(file)
            } catch { }
        }
    }
}