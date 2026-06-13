import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

// Retrieve the encryption key from environment variables
const getEncryptionKey = (): Buffer => {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined!')
  }
  
  // Enforce 32 bytes (64 hex characters)
  if (keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)!')
  }
  
  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypts a string of text.
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  // Return IV combined with ciphertext, separated by a colon
  return `${iv.toString('hex')}:${encrypted}`
}

/**
 * Decrypts a string of encrypted text.
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey()
  const [ivHex, ciphertextHex] = encryptedText.split(':')
  
  if (!ivHex || !ciphertextHex) {
    throw new Error('Invalid encrypted text format. Expected iv:ciphertext')
  }
  
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
