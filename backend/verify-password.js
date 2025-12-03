require('dotenv').config();

console.log('🔐 Password Verification:\n');

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.log('❌ SUPABASE_DB_PASSWORD not found in .env');
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD;

console.log('Password from .env:');
console.log('  Status: SET');
console.log('  Length:', password.length, 'characters');
console.log('  Has @:', password.includes('@'));
console.log('  Has special chars:', /[!@#$%^&*(),.?":{}|<>]/.test(password));
console.log('');
console.log('Encoded for URL (first 30 chars only):');
const encoded = encodeURIComponent(password);
console.log('  Single encode:', encoded.substring(0, 30) + (encoded.length > 30 ? '...' : ''));
const doubleEncoded = encodeURIComponent(encodeURIComponent(password));
console.log('  Double encode:', doubleEncoded.substring(0, 30) + (doubleEncoded.length > 30 ? '...' : ''));
console.log('');
console.log('⚠️  IMPORTANT:');
console.log('1. Verify the password in Supabase Dashboard → Settings → Database');
console.log('2. Make sure it\'s the DATABASE PASSWORD (not API key)');
console.log('3. If you recently changed the password, make sure .env has the new one');
console.log('4. If password contains special characters, it should be URL-encoded in connection string');

