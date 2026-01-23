// Debug script - runs before anything else
console.log('🚨 IMMEDIATE TEST: popup.html loaded! Version 2024-01-16-v10-DEBUG');
console.log('🚨 If you see v10-DEBUG, the new HTML is loaded!');
console.log('🚨 Testing dueDate field existence...');

// Test immediately (no setTimeout)
const dueDateField = document.getElementById('dueDate');
console.log('🚨 dueDate field IMMEDIATE check:', dueDateField);
if (dueDateField) {
  console.log('🚨 ✅ dueDate field EXISTS!');
  console.log('🚨 Field details:', {
    type: dueDateField.type,
    required: dueDateField.required,
    style: dueDateField.getAttribute('style'),
    display: window.getComputedStyle(dueDateField).display,
    visibility: window.getComputedStyle(dueDateField).visibility
  });
} else {
  console.log('🚨 ❌ dueDate field NOT FOUND!');
}

// Also test with setTimeout
setTimeout(() => {
  console.log('🚨 setTimeout executed after 2 seconds');
  const dueDateField2 = document.getElementById('dueDate');
  console.log('🚨 dueDate field on timeout:', dueDateField2);
}, 2000);
