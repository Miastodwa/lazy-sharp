import {
	CreateWriteStreamOptions,
	GetSignedUrlConfig,
} from '@google-cloud/storage'
import * as Cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { QueryParams } from './@types'
import {
	buildPipeline,
	generateSufix,
	getFileParams,
	getPreset,
	getResizeOptions,
	splitFileName,
} from './utils'

const cors = Cors({ origin: true })

const CONFIG: GetSignedUrlConfig = { action: 'read', expires: '01-01-2100' }
const PRESET_ONLY = false

admin.initializeApp()

export const lazysharp = functions
	.region('europe-west1')
	.https.onRequest((req, res) => {
		process.on('unhandledRejection', error => {
			console.error('unhandledRejection', error)
			return res.status(500).send(error)
		})

		if (req.method !== 'GET') {
			return res.status(405).send('Method Not Allowed')
		}

		return cors(req, res, async () => {
			const query: QueryParams = req.query
			const preset = getPreset(query)

			// check for required query params
			if (!query.bucket) {
				return res.status(422).send('bucket required')
			}
			if (!query.ref) {
				return res.status(422).send('ref required')
			}
			if (PRESET_ONLY && !preset) {
				return res
					.status(422)
					.send('only preset configurations allowed')
			}

			const [name, ext] = splitFileName(query.ref)
			const originalFormat = ext === 'jpg' ? 'jpeg' : ext

			const resizeOptions = getResizeOptions(query)
			const fileParams = getFileParams(query)

			const sufix = generateSufix(resizeOptions)
			const sufixedName = `${name}__${sufix}__.${fileParams.format}`

			const storage = admin.storage()
			const bucket = storage.bucket(fileParams.bucket)
			const original = bucket.file(fileParams.ref)
			const modified = bucket.file(sufixedName)

			// if no requested transforms, redirect to original.
			if (!sufix && originalFormat === fileParams.format) {
				const [url] = await original
					.getSignedUrl(CONFIG)
					.catch(e => [Error(e)])

				if (url instanceof Error) {
					console.error(url)
					return res.status(500).send(url.message)
				}

				console.log('original')

				if (fileParams.result === 'url') {
					return res.send(url)
				} else {
					return res.redirect(301, url)
				}
			}

			// if modified exists, redirect to it.
			console.log('checking modified...')
			const modifiedData = await Promise.all([
				modified.exists(),
				modified.getSignedUrl(CONFIG),
			]).catch(e => Error(e))

			if (modifiedData instanceof Error) {
				console.log(modifiedData)
				return res.status(500).send(modifiedData.message)
			}
			const [[modifiedExists], [modifiedUrl]] = modifiedData

			if (modifiedExists) {
				console.log('...modified exists')
				if (fileParams.result === 'url') {
					return res.send(modifiedUrl)
				} else {
					return res.redirect(301, modifiedUrl)
				}
			}

			// if neither original or modified exist, return 404
			const [originalExists] = await original.exists().catch(e => null)
			if (!originalExists) {
				return res.status(404).send(`${fileParams.ref} does not exist`)
			}

			// if modified doesn't exist and original does, create modified, and redirect to it
			console.log('creating file...')
			const { format } = fileParams
			const modifiedMeta: CreateWriteStreamOptions = {
				public: true,
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

			await promiseUpload

			console.log('...file created')
			if (fileParams.result === 'url') {
				return res.send(modifiedUrl)
			} else {
				return res.redirect(301, modifiedUrl)
			}
		})
	})
