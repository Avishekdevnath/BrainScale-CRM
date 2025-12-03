const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '.env');

console.log('🔧 Updating .env file with Supabase credentials...\n');

// Read current .env
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Supabase credentials (update these)
const supabaseCredentials = `
# Supabase Connection (Option 2 - New Method)
SUPABASE_PROJECT_URL=https://fgkilgswmognmiiiwakn.supabase.co
SUPABASE_DB_PASSWORD=36w9a@_@
SUPABASE_REGION=ap-southeast-1
`;

// Comment out old connection strings if they exist
envContent = envContent.replace(
  /^DATABASE_URL=.*$/m,
  '# DATABASE_URL=... (using SUPABASE_PROJECT_URL instead)'
);

envContent = envContent.replace(
  /^TRANSACTION_POOLER=.*$/m,
  '# TRANSACTION_POOLER=... (using SUPABASE_PROJECT_URL instead)'
);

envContent = envContent.replace(
  /^SESSION_POOLER=.*$/m,
  '# SESSION_POOLER=... (using SUPABASE_PROJECT_URL instead)'
);

// Remove existing SUPABASE_* lines if any
envContent = envContent.replace(/^SUPABASE_PROJECT_URL=.*$/m, '');
envContent = envContent.replace(/^SUPABASE_DB_PASSWORD=.*$/m, '');
envContent = envContent.replace(/^SUPABASE_REGION=.*$/m, '');

// Add Supabase credentials at the end
envContent += '\n' + supabaseCredentials;

// Write back
fs.writeFileSync(envPath, envContent);

console.log('✅ Updated .env file!');
console.log('Added/Updated:');
console.log('  - SUPABASE_PROJECT_URL');
console.log('  - SUPABASE_DB_PASSWORD');
console.log('  - SUPABASE_REGION');
console.log('\nCommented out old connection strings (DATABASE_URL, TRANSACTION_POOLER, SESSION_POOLER)');
console.log('\n📝 Please verify the .env file and run: npm run db:migrate');

