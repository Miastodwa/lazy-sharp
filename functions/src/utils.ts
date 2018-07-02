const baseUrl = 'https://firebasestorage.googleapis.com/v0/'
const baseMedialink = 'https://www.googleapis.com/download/storage/v1/'

export function fileUrl(meta: any){
    return meta.mediaLink.replace(baseMedialink, baseUrl)
}