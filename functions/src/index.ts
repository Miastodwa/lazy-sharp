import { CreateWriteStreamOptions } from '@google-cloud/storage'
import * as Cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { QueryParams } from './@types'
import {
	buildPipeline,
	FbResourceUrl,
	generateSufix,
	getFileParams,
	getPreset,
	getResizeOptions,
	splitFileName,
	successfulResponse,
	unhandledRejections,
} from './utils'

const cors = Cors({ origin: true, methods: 'GET' })

admin.initializeApp()

export const lazysharp = functions
	.region('europe-west1')
	.https.onRequest((req, res) => {
		unhandledRejections(res)

		return cors(req, res, async () => {
			const query: QueryParams = req.query

			// check for required query params
			if (req.method !== 'GET') {
				return res.status(405).send('method not allowed')
			}
			if (!query.bucket) {
				return res.status(422).send('bucket required')
			}
			if (!query.path) {
				return res.status(422).send('path required')
			}

			const [name, ext] = splitFileName(query.path)
			const originalFormat = ext === 'jpg' ? 'jpeg' : ext

			const resizeOptions = getResizeOptions(query)
			const fileParams = getFileParams(query)

			const sufix = generateSufix(resizeOptions, query.preset)
			const sufixedName = `${name}${sufix}.${fileParams.format}`

			const storage = admin.storage()
			const bucket = storage.bucket(fileParams.bucket)
			const original = bucket.file(fileParams.path)
			const modified = bucket.file(sufixedName)
			const originalUrl = FbResourceUrl(bucket.name, original.name)
			const modifiedUrl = FbResourceUrl(bucket.name, modified.name)

			// if no requested transforms, redirect to original.
			if (!sufix && originalFormat === fileParams.format) {
				console.log('original')
				return successfulResponse(res, fileParams.result, originalUrl)
			}

			// if modified exists, redirect to it.
			const [modifiedExists] = await modified.exists().catch(e => null)
			if (modifiedExists) {
				console.log('...modified exists')
				return successfulResponse(res, fileParams.result, modifiedUrl)
			}

			// if neither original or modified exist, return 404
			const [originalExists] = await original.exists().catch(e => null)
			if (!originalExists) {
				return res.status(404).send(`${fileParams.path} does not exist`)
			}

			// if modified doesn't exist and original does, create modified, and redirect to it
			console.log('creating file...')
			const { format } = fileParams
			const modifiedMeta: CreateWriteStreamOptions = {
				metadata: {
					contentType: `image/${format}`,
					cacheControl: fileParams.cacheControl,
				},
			}
			const pipeline = await buildPipeline(
				resizeOptions,
				format
			).catch(e => Error(e))
			if (pipeline instanceof Error) {
				return res.status(422).send(pipeline.message)
			}

			const fileUploadStream = modified.createWriteStream(modifiedMeta)

			original
				.createReadStream()
				.pipe(pipeline)
				.pipe(fileUploadStream)

			const promiseUpload = new Promise((resolve, reject) =>
				fileUploadStream.on('finish', resolve).on('error', reject)
			)

			const uploadResult = await promiseUpload.catch(e => Error(e))
			if (uploadResult instanceof Error) {
				return res.status(500).send(uploadResult.message)
			}

			console.log('...file created')
			return successfulResponse(res, fileParams.result, modifiedUrl)
		})
	})
