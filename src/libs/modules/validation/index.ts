import { UploadedFile } from 'express-fileupload'

function date(stringIn: string): string | boolean {
  return /[12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/.test(stringIn)
}
function phone(phoneNumber: string): string | boolean {
  if (!phoneNumber) {
    return `Expected phone number got ${phoneNumber}`
  }
  const test = /\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/.test(phoneNumber)
  if (!test) {
    return `Invalid phone number: ${phoneNumber}`
  }
  return true
}
function link(payload: { type: 'facebook' | 'instagram' | 'linkedin' | 'twitter', data: string }): string | boolean {
  if (!payload || typeof payload !== 'object') {
    return `Expected parameters { type, link } , got "${payload}"`
  }
  if (!payload.type) return 'Invalid type'
  if (!payload.data) return 'Invalid link'
  const { type } = payload
  const receivedUrl = payload.data
  const models: {
    facebook: RegExp
    instagram: RegExp
    linkedin: RegExp
    twitter: RegExp
  } = {
    facebook: /^https:\/\/(www.)?facebook\.com\/.{1,}$/,
    instagram: /^https:\/\/(www.)?instagram\.com\/.{1,}$/,
    linkedin: /^https:\/\/(www.)?linkedin\.com\/.{1,}$/,
    twitter: /^https:\/\/(www.)?twitter\.com\/.{1,}$/
  }
  if (typeof models[type] === 'undefined') return `Unavailable link type "${type}"`
  const test = models[type].test(receivedUrl)
  if (test === null) {
    return `Invalid ${type} link: ${receivedUrl}`
  }
  return true
}
function url(receivedUrl: string): string | boolean {
  if (!receivedUrl) {
    return `Expected url param, got ${receivedUrl}`
  }
  const test = /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)$/.test(receivedUrl)
  if (test !== true) {
    return `Invalid url address: ${receivedUrl}`
  }
  return true
}
const extensions: {
  [key: string]: string[]
} = {
  image: ['ase', 'art', 'bmp', 'blp', 'cd5', 'cit', 'cpt', 'cr2', 'cut', 'dds', 'dib', 'djvu', 'egt', 'exif', 'gif', 'gpl', 'grf', 'icns', 'ico', 'iff', 'jng', 'jpeg', 'jpg', 'jfif', 'jp2', 'jps', 'lbm', 'max', 'miff', 'mng', 'msp', 'nitf', 'ota', 'pbm', 'pc1', 'pc2', 'pc3', 'pcf', 'pcx', 'pdn', 'pgm', 'PI1', 'PI2', 'PI3', 'pict', 'pct', 'pnm', 'pns', 'ppm', 'psb', 'psd', 'pdd', 'psp', 'px', 'pxm', 'pxr', 'qfx', 'raw', 'rle', 'sct', 'sgi', 'rgb', 'int', 'bw', 'tga', 'tiff', 'tif', 'vtf', 'xbm', 'xcf', 'xpm', '3dv', 'amf', 'ai', 'awg', 'cgm', 'cdr', 'cmx', 'dxf', 'e2d', 'egt', 'eps', 'fs', 'gbr', 'odg', 'svg', 'stl', 'vrml', 'x3d', 'sxd', 'v2d', 'vnd', 'wmf', 'emf', 'art', 'xar', 'png', 'webp', 'jxr', 'hdp', 'wdp', 'cur', 'ecw', 'iff', 'lbm', 'liff', 'nrrd', 'pam', 'pcx', 'pgf', 'sgi', 'rgb', 'rgba', 'bw', 'int', 'inta', 'sid', 'ras', 'sun', 'tga'],
  microsoftOffice: ['doc', 'dot', 'wbk', 'docx', 'docm', 'dotz', 'dotm', 'docb', 'xls', 'xlt', 'xlsx', 'xml', 'slsx', 'slsm', 'xltm', 'xlsb', 'xla', 'xlam', 'xll', 'xlw', 'ppt', 'pot', 'pps', 'pptx', 'pptm', 'potx', 'ptm', 'ppam', 'ppsx', 'ppxm', 'sldx', 'sldm', 'accdb', 'accde', 'accdt', 'addcr', 'pub', 'xps'],
  video: ['3g2', '3gp', 'aaf', 'asf', 'avchd', 'avi', 'drc', 'flv', 'm2v', 'm4p', 'm4v', 'mkv', 'mng', 'mov', 'mp2', 'mp4', 'mpe', 'mpeg', 'mpg', 'mpv', 'mxf', 'nsv', 'ogg', 'ogv', 'qt', 'rm', 'rmvb', 'roq', 'svi', 'vob', 'webm', 'wmv', 'yuv'],
  audio: ['wav', 'bwf', 'raw', 'aiff', 'flac', 'm4a', 'pac', 'tta', 'wv', 'ast', 'aac', 'mp3', 'amr', 's3m', 'act', 'au', 'dct', 'dss', 'gsm', 'mmf', 'mpc', 'oga', 'opus', 'ra', 'sln', 'vox'],
  pdf: ['pdf'],
  text: ['txt'],
  table: ['xml', 'xlsx', 'csv', 'tsv', 'xls']
}
const mimetypes: {
  [key: string]: string[]
} = {
  image: ['image/bmp', 'image/prs.btif', 'image/cgm', 'image/x-cmx', 'image/vnd.djvu', 'image/vnd.djvu', 'image/vnd.dwg', 'image/vnd.dxf', 'image/vnd.fastbidsheet', 'image/x-freehand', 'image/x-freehand', 'image/x-freehand', 'image/x-freehand', 'image/x-freehand', 'image/vnd.fpx', 'image/vnd.fst', 'image/g3fax', 'image/gif', 'image/x-icon', 'image/ief', 'image/jpeg', 'image/jpeg', 'image/jpeg', 'image/vnd.ms-modi', 'image/vnd.fujixerox.edmics-mmr', 'image/vnd.net-fpx', 'image/x-portable-bitmap', 'image/x-pict', 'image/x-pcx', 'image/x-portable-graymap', 'image/x-pict', 'image/png', 'image/x-portable-anymap', 'image/x-portable-pixmap', 'image/vnd.adobe.photoshop', 'image/x-cmu-raster', 'image/x-rgb', 'image/vnd.fujixerox.edmics-rlc', 'image/svg+xml', 'image/svg+xml', 'image/tiff', 'image/tiff', 'image/vnd.wap.wbmp', 'image/x-xbitmap', 'image/vnd.xiff', 'image/x-xpixmap', 'image/x-xwindowdump'],
  video: ['video/3gpp2', 'video/3gpp', 'video/x-ms-asf', 'video/x-ms-asf', 'video/x-msvideo', 'video/x-f4v', 'video/x-fli', 'video/x-flv', 'video/vnd.fvt', 'video/h261', 'video/h263', 'video/h264', 'video/jpm', 'video/jpeg', 'video/jpm', 'video/mpeg', 'video/mpeg', 'video/vnd.mpegurl', 'video/x-m4v', 'video/mj2', 'video/mj2', 'video/quicktime', 'video/x-sgi-movie', 'video/mp4', 'video/mp4', 'video/mpeg', 'video/mpeg', 'video/mpeg', 'video/mpeg', 'video/mp4', 'video/vnd.mpegurl', 'video/ogg', 'video/vnd.ms-playready.media.pyv', 'video/quicktime', 'video/vnd.vivo', 'video/x-ms-wm', 'video/x-ms-wmv', 'video/x-ms-wmx', 'video/x-ms-wvx']
}
function checkIfFileIsValid(file: UploadedFile | UploadedFile[]) {
  if (Array.isArray(file)) {
    return false
  }
  const name = (file.name || '').toLowerCase()
  let checker = false
  // Search inside name
  for (const fileType of Object.keys(extensions)) {
    for (const ext of extensions[fileType]) {
      if (name.includes(`.${ext}`)) {
        checker = true
      }
    }
  }
  // Search inside mimetype
  if (!checker && file.mimetype) {
    Object.keys(mimetypes).forEach(fileType => {
      mimetypes[fileType].forEach(mime => {
        if (file.mimetype === mime) {
          checker = true
        }
      })
    })
  }
  return checker
}
function checkFileType(file: UploadedFile) {
  const name = (file.name || '').toLowerCase()
  let finalType
  // Search inside name
  Object.keys(extensions).forEach(fileType => {
    let breaker = false
    extensions[fileType].forEach(ext => {
      if (name.includes(`.${ext}`)) {
        finalType = fileType
        breaker = true
      }
    })
    if (breaker) {
      return false
    }
    return true
  })
  // Search inside mimetype
  if (!finalType && file.mimetype) {
    Object.keys(mimetypes).forEach(fileType => {
      let breaker = false
      mimetypes[fileType].forEach(mime => {
        if (file.mimetype === mime) {
          finalType = fileType
          breaker = true
        }
      })
      if (breaker) {
        return false
      }
      return true
    })
  }
  return finalType
}
export default {
  date,
  phone,
  link,
  url,
  email: (email: string): boolean => {
    if (/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return true
    }
    return false
  },
  file: (payload: {
    file: UploadedFile | UploadedFile[]
    type?: string
    maxSize?: number
  }): string | true => {
    /* Params
    * @file - file
    * @maxSize - int
    * @type - string
    */
    const { file } = payload
    if (Array.isArray(file)) {
      return 'Received array of files instead of single file'
    }
    const maxSize = payload.maxSize || 10000000
    const { type } = payload
    if (!file) { return 'Invalid file!' }
    if (!file.size) { return 'Invalid file size!' }
    if (file.size > maxSize) {
      return 'Your file is too big!'
    }
    if (!file.name) {
      return 'Invalid file name!'
    }
    // Verify malicious files
    if (!checkIfFileIsValid(file)) {
      return `Unexpected file "${file.name}". Possible malicious!`
    }
    if (type) {
      const fileType = checkFileType(file)
      if (fileType !== type) {
        return `This is not a/n ${type}. FileName: ${file.name}`
      }
    }
    return true
  }
}
