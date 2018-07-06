import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as Cors from 'cors'
import {fileUrl, getParams, buidlPipeline, buildPrefix, replaceExt} from './utils'
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
		const modifiedName = replaceExt(params.name, params.sharp.toFormat)
		const modified = bucket.file(params.folder + prefix + modifiedName)

		// if no prefix, redirect to original.
		if (!prefix) {
			const [meta] = await original.getMetadata()
			if (params.result === 'redirect') res.redirect(301, fileUrl(meta))
			if (params.result === 'stream') res.redirect(301, fileUrl(meta))
			if (params.result === 'url') res.send({ mediaLink: fileUrl(meta) })
		}

		// Check if original and modified files exist
		const exist = await Promise
			.all([original.exists(), modified.exists()])
			.then(v => [v[0][0], v[1][0]])

//________________________________________

		// if none exist, 404
		if (!exist[0] && !exist[1]) {
			console.log('not found')
			res.status(404)
			res.send()
		}

		// if modified exists, redirect to it.
		if (exist[1]) {
			console.log('modified exists')
			const [meta] = await modified.getMetadata()
			if (params.result === 'redirect') res.redirect(301, fileUrl(meta))
			if (params.result === 'stream') res.redirect(301, fileUrl(meta))
			if (params.result === 'url') res.send({ mediaLink: fileUrl(meta) })
		}

		// if original exists, and modified doesn't, create it, and redirect to it
		if(exist[0] && !exist[1]){
			console.log('creating file...')
			const [originalMeta] = await original.getMetadata()

			const modifiedMeta: WriteStreamOptions = {
				public: true,
				metadata: {
					contentType: `image/${params.sharp.toFormat}`,
					cacheControl: originalMeta.cacheControl,
				}
			}
			
			const pipeline = buidlPipeline(params.sharp)

			const fileUploadStream = modified.createWriteStream(modifiedMeta)

			if (params.result === 'stream') {
				original.createReadStream().pipe(pipeline).pipe(res)
				return
			}

			original.createReadStream().pipe(pipeline).pipe(fileUploadStream)

			const promiseUpload = new Promise((resolve, reject) =>
				fileUploadStream.on('finish', resolve).on('error', reject)
			)
			await promiseUpload.catch( err => res.status(500).send(err) )
			console.log('...file created')

			const [meta] = await modified.getMetadata()
			if (params.result === 'redirect') res.redirect(301, fileUrl(meta))
			if (params.result === 'url') res.send({ mediaLink: fileUrl(meta) })
		}
	})
})