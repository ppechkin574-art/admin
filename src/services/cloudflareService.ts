import axios from 'axios'

// Cloudflare Stream upload disabled in production until the Cloudflare
// Stream subscription is provisioned (TECH_DEBT.md Roadmap to Production
// item #8, 07.05.2026). All upload / delete / fetch methods throw a
// user-visible Russian error so admins immediately see what's wrong
// instead of opaque Cloudflare 403/404 responses.
//
// To re-enable:
//   1. Set up a Cloudflare Stream account and obtain VITE_CLOUDFLARE_API_TOKEN
//      and VITE_CLOUDFLARE_ACCOUNT_ID. Add them to the admin Railway service.
//   2. Replace this file with the previous git revision (commit before
//      the 07.05.2026 audit) — the integration code is preserved there.

const FEATURE_DISABLED_MESSAGE =
    'Загрузка медиа через Cloudflare Stream временно отключена. ' +
    'Пожалуйста, обратитесь к администратору, чтобы активировать видео-уроки.'

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
    async uploadVideo(_file: File, _onProgress?: (progress: CloudflareUploadProgress) => void): Promise<string> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        void axios
        throw new Error(FEATURE_DISABLED_MESSAGE)
    }

    async uploadPresentation(_file: File, _onProgress?: (progress: CloudflareUploadProgress) => void): Promise<string> {
        throw new Error(FEATURE_DISABLED_MESSAGE)
    }

    async deleteMedia(_mediaId: string): Promise<void> {
        throw new Error(FEATURE_DISABLED_MESSAGE)
    }

    async getMediaInfo(_mediaId: string): Promise<any> {
        throw new Error(FEATURE_DISABLED_MESSAGE)
    }
}

export const cloudflareService = new CloudflareService()
