export interface Block {
  order: number
  type: 'text' | 'media'
  value: string
}

export const getTextFromBlocks = (blocks: Block[] = []): string => {
  if (!blocks || !Array.isArray(blocks)) return ''
  
  return blocks
    .filter(block => block.type === 'text')
    .sort((a, b) => a.order - b.order)
    .map(block => block.value)
    .join(' ')
    .trim()
}

export const getMediaFromBlocks = (blocks: Block[] = []): Block[] => {
  if (!blocks || !Array.isArray(blocks)) return []
  
  return blocks
    .filter(block => block.type === 'media')
    .sort((a, b) => a.order - b.order)
}

export const hasMediaInBlocks = (blocks: Block[] = []): boolean => {
  return getMediaFromBlocks(blocks).length > 0
}

export const createTextBlocks = (text: string, order = 0): Block[] => {
  if (!text || text.trim() === '') return []
  return [{ order, type: 'text', value: text.trim() }]
}

export const createMediaBlocks = (url: string, order = 1): Block[] => {
  if (!url || url.trim() === '') return []
  return [{ order, type: 'media', value: url.trim() }]
}

export const convertToBlocks = (text: string, imageUrl: string): Block[] => {
  const blocks: Block[] = []
  
  if (text && text.trim() !== '') {
    blocks.push({ order: 0, type: 'text', value: text.trim() })
  }
  
  if (imageUrl && imageUrl.trim() !== '') {
    blocks.push({ order: 1, type: 'media', value: imageUrl.trim() })
  }
  
  return blocks.sort((a, b) => a.order - b.order)
}

export const extractMainText = (blocks: Block[] = []): string => {
  const textBlocks = blocks
    .filter(block => block.type === 'text')
    .sort((a, b) => a.order - b.order)
  
  return textBlocks.length > 0 ? textBlocks[0].value : ''
}

export const extractImageUrl = (blocks: Block[] = []): string => {
  const mediaBlocks = blocks
    .filter(block => block.type === 'media')
    .sort((a, b) => a.order - b.order)
  
  return mediaBlocks.length > 0 ? mediaBlocks[0].value : ''
}