import sharp from 'sharp'

const namespace = {
  fromBuffer(buffer: Buffer): { [key: string]: any } {
    return {
      resize(width: number, height: number, options: { format: 'png' | 'jpeg' } = { format: 'png' }): any {
        const base = sharp(buffer).resize({
          width,
          height,
          fit: 'contain',
          position: 'center',
          background: { r: 255, g: 255, b: 255 }
        })[options.format]()
        return {
          async toBuffer() {
            const finalBuffer = await base.toBuffer()
            return finalBuffer
          }
        }
      }
    }
  }
}

export default namespace
