const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Express.js RBAC Backend...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  
  const envExamplePath = path.join(__dirname, '..', 'env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully');
    console.log('⚠️  Please update the .env file with your configuration values');
  } else {
    console.log('❌ env.example file not found');
  }
} else {
  console.log('✅ .env file already exists');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n📦 Installing dependencies...');
  console.log('Run: npm install');
} else {
  console.log('\n✅ Dependencies already installed');
}

// Check if MongoDB is accessible
console.log('\n🔍 Checking MongoDB connection...');
console.log('Make sure MongoDB is running and accessible');

console.log('\n📋 Next steps:');
console.log('1. Update .env file with your configuration');
console.log('2. Ensure MongoDB is running');
console.log('3. Run: npm run seed (to populate initial data)');
console.log('4. Run: npm run dev (to start development server)');
console.log('\n🎯 Default credentials after seeding:');
console.log('   Admin: admin@example.com / admin123');
console.log('   Employee: john.employee@example.com / employee123');
console.log('   Customer: jane.customer@example.com / customer123');

console.log('\n✨ Setup complete! Happy coding! 🎉');
