import { TransformParams, SharpParams } from './types'
import * as sharp from 'sharp'

const baseFirebaseLink = 'https://firebasestorage.googleapis.com/v0/'
const baseMedialink = 'https://www.googleapis.com/download/storage/v1/'

export function fileUrl(meta: any){
    return meta.mediaLink.replace(baseMedialink, baseFirebaseLink)
}

export function getParams(q: any ): TransformParams {

    function parseResize(): number[] {
        const vals = []
        if (q.width) vals.push(parseInt(q.width))
        if (q.height) vals.push(parseInt(q.height))
        return vals
    }

    function parseFolder(): string {
        if (!q.folder) return ''
        if (q.folder.endsWith('/')) return q.folder
        else return q.folder + '/'
    }

    const sharpParams: SharpParams = {
        resize: parseResize(),
        resizeLimit: q.resizeLimit || 'max',
        crop: q.crop || false,
        embed: q.crop ? false : q.embed || false,
        toFormat: q.toFormat || 'webp'
    }

    const params: TransformParams = {
        bucket: q.bucket,
        folder: parseFolder(),
        name: q.name,
        result: q.result || 'url',
        sharp: sharpParams
    }
    return params
}

export function buidlPipeline( p: SharpParams ) {
    const pipeline = sharp()
    if (p.resize) pipeline.resize( p.resize[0], p.resize[1] )[p.resizeLimit]()
    if (p.crop) pipeline.crop(p.crop)
    if (p.embed) pipeline.embed()
    return pipeline.toFormat(p.toFormat)
}

export function buildPrefix(p: SharpParams): string {
    if (!p) return null
    const params = []
    if (p.resize.length) params.push(`resize:${p.resize.join(',')}`)
    if (p.crop) params.push(`crop:${p.crop}`)
    if (p.embed) params.push(`embed:${p.embed}`)
    return params.length ? params.join('|') + '__' : null
}