import axios from 'axios'

const CLOUDFLARE_API_TOKEN = import.meta.env.VITE_CLOUDFLARE_API_TOKEN
const CLOUDFLARE_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID

export interface CloudflareUploadResponse {
    result: {
        uid: string
        filename: string
        size: number
        mimeType: string
        duration?: number
        thumbnail?: string
        readyToStream: boolean
        status: {
            state: string
            errorReasonCode: string
            errorReasonText: string
        }
    }
    success: boolean
    errors: any[]
    messages: any[]
}

export interface CloudflareUploadProgress {
    loaded: number
    total: number
    progress: number
}

class CloudflareService {
    private baseUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`

    async uploadVideo(file: File, onProgress?: (progress: CloudflareUploadProgress) => void): Promise<string> {
        const formData = new FormData()
        formData.append('file', file)

        const response = await axios.post<CloudflareUploadResponse>(this.baseUrl, formData, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    onProgress({
                        loaded: progressEvent.loaded,
                        total: progressEvent.total,
                        progress: Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    })
                }
            }
        })

        if (!response.data.success) {
            throw new Error('Cloudflare upload failed: ' + JSON.stringify(response.data.errors))
        }

        return response.data.result.uid
    }

    async uploadPresentation(file: File, onProgress?: (progress: CloudflareUploadProgress) => void): Promise<string> {
        // Для презентаций используем ту же API, но можем обрабатывать по-разному
        return this.uploadVideo(file, onProgress)
    }

    async deleteMedia(mediaId: string): Promise<void> {
        await axios.delete(`${this.baseUrl}/${mediaId}`, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
            }
        })
    }

    async getMediaInfo(mediaId: string): Promise<any> {
        const response = await axios.get(`${this.baseUrl}/${mediaId}`, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
            }
        })
        return response.data
    }
}

export const cloudflareService = new CloudflareService()