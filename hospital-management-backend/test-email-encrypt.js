const crypto = require('crypto');

// Same encryption logic as in shared package
function encryptEmail(email) {
  const algorithm = 'aes-256-cbc';
  const key = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!';
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(email, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return encrypted;
}

// Test email encryption
const email = 'phubanh0208@gmail.com';
const encrypted = encryptEmail(email);

console.log('Original email:', email);
console.log('Encrypted email:', encrypted);

// Test multiple times to see if it's consistent
console.log('\nTesting consistency:');
for (let i = 0; i < 3; i++) {
  console.log(`Attempt ${i + 1}:`, encryptEmail(email));
}
