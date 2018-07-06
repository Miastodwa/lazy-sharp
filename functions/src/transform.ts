import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as Cors from 'cors'
import {fileUrl, getParams, buidlPipeline, buildPrefix} from './utils'
import { WriteStreamOptions } from '@google-cloud/storage'
const cors = Cors({ origin: true })

admin.initializeApp()

export const transform = functions.https.onRequest((req, res) => {

	if (req.method !== 'GET') return res.status(403).send('Forbidden')

	return cors(req, res, async () => {

		const params = getParams(req.query)
		const prefix = buildPrefix(params.sharp)
		
		const storage = admin.storage()
		const bucket = storage.bucket(params.bucket)
		const original = bucket.file(params.folder + params.name)
		const modified = bucket.file(params.folder + prefix + params.name)

		// if no prefix, redirect to original.
		if (!prefix) {
			const [meta] = await original.getMetadata()
			res.redirect(301, fileUrl(meta))
		}

		// Check if original and modified files exist
		const exist = await Promise
			.all([original.exists(), modified.exists()])
			.then(v => [v[0][0], v[1][0]])

		// if none exist, 404
		if (!exist[0] && !exist[1]) {
			res.status(404)
			res.send()
		}

		// if modified exists, redirect to it.
		if (exist[1]) {
			const [meta] = await modified.getMetadata()
			res.redirect(301, fileUrl(meta))
		}

		// if original exists, and modified doesn't, create it, and redirect to it
		if(exist[0] && !exist[1]){
			const [meta] = await original.getMetadata()
			console.log(meta)
			console.log(original)

			const modifiedMeta: WriteStreamOptions = {
				public: true,
				metadata: {
					contentType: meta.contentType,
					cacheControl: meta.cacheControl,
				}
			}
			
			const pipeline = buidlPipeline(params.sharp)

			const fileUploadStream = modified.createWriteStream(modifiedMeta)

			original.createReadStream().pipe(pipeline).pipe(fileUploadStream)

			const streamAsPromise = new Promise((resolve, reject) =>
				fileUploadStream.on('finish', resolve).on('error', reject)
			)
			await streamAsPromise
				.catch(err => {
					console.log(err)
					return res.status(500).send(err)
				})

			res.set('Cache-Control', 'public, max-age=60, s-maxage=31536000')
			res.writeHead(200, { contentType: meta.contentType })
			original.createReadStream().pipe(pipeline).pipe(res)
		}
	})
})