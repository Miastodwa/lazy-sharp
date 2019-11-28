import {
	CreateWriteStreamOptions,
	GetSignedUrlConfig,
} from '@google-cloud/storage'
import * as Cors from 'cors'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import * as sharp from 'sharp'
import { buildPipeline, buildSufix, splitFileName } from './utils'

const cors = Cors({ origin: true })

const CONFIG: GetSignedUrlConfig = { action: 'read', expires: '01-01-2100' }
const CACHE_CONTROL = 'public, max-age=31536000'
const FORMATS = ['jpeg', 'png', 'webp']

admin.initializeApp()

// OR:
// const { service } = functions.config()
// const creds = service ? { credential: admin.credential.cert(service) } : {}
// admin.initializeApp(service)

export const lazysharp = functions
	.region('europe-west1')
	.https.onRequest((req, res) => {
		process.on('unhandledRejection', error => {
			console.log('unhandledRejection', error)
			return res.status(500).send(error)
		})

		if (req.method !== 'GET') {
			return res.status(405).send('Method Not Allowed')
		}

		return cors(req, res, async () => {
			const { query } = req

			// check for required params
			if (!query.bucket) {
				return res.status(422).send('bucket required')
			}
			if (!query.ref) {
				return res.status(422).send('ref required')
			}

			const [name, ext] = splitFileName(query.ref)
			const originalFormat = ext === 'jpg' ? 'jpeg' : ext

			const resizeOptions: sharp.ResizeOptions = {
				width: +query.width || null,
				height: +query.height || null,
				fit: query.fit,
				position: query.position,
				background: query.background,
				withoutEnlargement: query.withoutEnlargement,
			}
			const params = {
				bucket: query.bucket,
				ref: query.ref,
				result: query.result || 'redirect',
				format: FORMATS.includes(query.format) ? query.format : 'jpeg',
				cacheControl: query.cacheControl,
			}
			const sufix = buildSufix(resizeOptions)
			const sufixedName = `${name}__${sufix}__.${params.format}`

			const storage = admin.storage()
			const bucket = storage.bucket(params.bucket)
			const original = bucket.file(params.ref)
			const modified = bucket.file(sufixedName)

			// if no requested transforms, redirect to original.
			if (!sufix && originalFormat === params.format) {
				const [url] = await original
					.getSignedUrl(CONFIG)
					.catch(e => [Error(e)])

				if (url instanceof Error) {
					console.error(url)
					return res.status(500).send(url.message)
				}

				console.log('original')

				if (params.result === 'url') {
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
				console.error(modifiedData)
				return res.status(500).send(modifiedData.message)
			}
			const [[modifiedExists], [modifiedUrl]] = modifiedData

			if (modifiedExists) {
				console.log('...modified exists')
				if (params.result === 'url') {
					return res.send(modifiedUrl)
				} else {
					return res.redirect(301, modifiedUrl)
				}
			}

			const [originalExists] = await original.exists().catch(e => null)
			if (!originalExists) {
				return res.status(404).send(`${params.ref} does not exist`)
			}

			// if modified doesn't exist and original does, create modified, and redirect to it
			console.log('creating file...')
			const { format } = params
			const modifiedMeta: CreateWriteStreamOptions = {
				public: true,
				metadata: {
					contentType: `image/${format}`,
					cacheControl: params.cacheControl || CACHE_CONTROL,
				},
			}
			const pipeline = await buildPipeline(
				resizeOptions,
				format
			).catch(e => res.status(422).send(e.message))
			if (!pipeline) {
				return
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
			if (params.result === 'url') {
				return res.send(modifiedUrl)
			} else {
				return res.redirect(301, modifiedUrl)
			}
		})
	})
