// Test phone validation function
const isValidPhone = (phone) => {
  // Remove all non-digit characters except + for international format
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  
  // Vietnam phone number patterns
  const vietnamRegex = /^(\+84|0)[3|5|7|8|9][0-9]{8}$/;
  
  // International phone number pattern (basic)
  const internationalRegex = /^\+[1-9]\d{1,14}$/;
  
  // US/Canada phone number pattern
  const usRegex = /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  
  // Basic phone number pattern (10-15 digits)
  const basicRegex = /^[0-9]{10,15}$/;
  
  return vietnamRegex.test(cleanPhone) || 
         internationalRegex.test(cleanPhone) || 
         usRegex.test(cleanPhone) || 
         basicRegex.test(cleanPhone);
};

// Test cases
const testCases = [
  // Vietnam numbers
  '0123456789',
  '+84123456789',
  '0987654321',
  '+84987654321',
  
  // International numbers
  '+1234567890',
  '+12345678901',
  '+123456789012',
  
  // US numbers
  '2345678901',
  '+12345678901',
  
  // With formatting
  '(123) 456-7890',
  '123-456-7890',
  '123.456.7890',
  '123 456 7890',
  
  // Invalid numbers
  '123',
  'abc123',
  '++123456789',
  '12345678901234567890', // too long
];

console.log('Phone Validation Test Results:');
console.log('================================');

testCases.forEach(phone => {
  const isValid = isValidPhone(phone);
  console.log(`${phone.padEnd(20)} -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});
