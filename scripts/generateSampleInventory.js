const xlsx = require('xlsx');
const path = require('path');

// Sample inventory data
const sampleData = [
  {
    'Name (Mandatory)': 'Toyota Camry 2024',
    'Type (Mandatory)': 'car',
    'Category (Mandatory)': 'Sedan',
    'Subcategory (Mandatory)': 'Mid-size',
    'Brand (Mandatory)': 'Toyota',
    'Model (Mandatory)': 'Camry',
    'Year (Mandatory)': 2024,
    'Color (Mandatory)': 'White',
    'Interior Color (Mandatory)': 'Black',
    'Description (Mandatory)': 'Brand new Toyota Camry 2024 model, excellent condition',
    'Cost Price (Mandatory)': 25000,
    'Selling Price (Mandatory)': 30000,
    'Quantity (Mandatory)': 2,
    'VIN Number (Mandatory)': '37845298678532heqwr42,4587634ghr4hr334545',
    'Length (Optional)': 4885,
    'Width (Optional)': 1840,
    'Height (Optional)': 1445,
    'Weight (Optional)': 1550
  },
  {
    'Name (Mandatory)': 'Honda Accord 2023',
    'Type (Mandatory)': 'car',
    'Category (Mandatory)': 'Sedan',
    'Subcategory (Mandatory)': 'Mid-size',
    'Brand (Mandatory)': 'Honda',
    'Model (Mandatory)': 'Accord',
    'Year (Mandatory)': 2023,
    'Color (Mandatory)': 'Silver',
    'Interior Color (Mandatory)': 'Beige',
    'Description (Mandatory)': 'Used Honda Accord in good condition',
    'Cost Price (Mandatory)': 20000,
    'Selling Price (Mandatory)': 25000,
    'Quantity (Mandatory)': 1,
    'VIN Number (Mandatory)': 'HONDA123456789ABCD',
    'Length (Optional)': 4900,
    'Width (Optional)': 1860,
    'Height (Optional)': 1450,
    'Weight (Optional)': 1520
  },
  {
    'Name (Mandatory)': 'BMW 3 Series 2024',
    'Type (Mandatory)': 'car',
    'Category (Mandatory)': 'Luxury',
    'Subcategory (Mandatory)': 'Sedan',
    'Brand (Mandatory)': 'BMW',
    'Model (Mandatory)': '3 Series',
    'Year (Mandatory)': 2024,
    'Color (Mandatory)': 'Black',
    'Interior Color (Mandatory)': 'Brown',
    'Description (Mandatory)': 'Premium BMW 3 Series, fully loaded',
    'Cost Price (Mandatory)': 45000,
    'Selling Price (Mandatory)': 55000,
    'Quantity (Mandatory)': 1,
    'VIN Number (Mandatory)': 'BMW2024XYZ123456',
    'Length (Optional)': 4700,
    'Width (Optional)': 1820,
    'Height (Optional)': 1440,
    'Weight (Optional)': 1600
  },
  {
    'Name (Mandatory)': 'Mercedes-Benz C-Class 2024',
    'Type (Mandatory)': 'car',
    'Category (Mandatory)': 'Luxury',
    'Subcategory (Mandatory)': 'Sedan',
    'Brand (Mandatory)': 'Mercedes-Benz',
    'Model (Mandatory)': 'C-Class',
    'Year (Mandatory)': 2024,
    'Color (Mandatory)': 'Blue',
    'Interior Color (Mandatory)': 'Black',
    'Description (Mandatory)': 'Luxury Mercedes C-Class with premium features',
    'Cost Price (Mandatory)': 50000,
    'Selling Price (Mandatory)': 60000,
    'Quantity (Mandatory)': 1,
    'VIN Number (Mandatory)': 'MB2024ABC789XYZ',
    'Length (Optional)': 4750,
    'Width (Optional)': 1820,
    'Height (Optional)': 1430,
    'Weight (Optional)': 1650
  }
];

// Create a new workbook
const workbook = xlsx.utils.book_new();

// Convert data to worksheet
const worksheet = xlsx.utils.json_to_sheet(sampleData);

// Add the worksheet to the workbook
xlsx.utils.book_append_sheet(workbook, worksheet, 'Inventory');

// Write the file
const outputPath = path.join(__dirname, '..', 'sample-inventory.xlsx');
xlsx.writeFile(workbook, outputPath);

console.log('✅ Sample Excel file created successfully!');
console.log(`📁 Location: ${outputPath}`);
console.log(`\n📊 File contains ${sampleData.length} sample car inventory items:`);
console.log('   - Toyota Camry 2024');
console.log('   - Honda Accord 2023');
console.log('   - BMW 3 Series 2024');
console.log('   - Mercedes-Benz C-Class 2024');
console.log('\n💡 You can use this file to test the bulk upload API:');
console.log('   POST /inventory/bulk-upload');

