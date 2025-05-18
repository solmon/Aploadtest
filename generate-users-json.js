const fs = require('fs');

// Read the users.txt file
const usersContent = fs.readFileSync('users.txt', 'utf8');

// Split the content into lines
const lines = usersContent.trim().split('\n');

// The first line is the header row, so we'll skip it
const users = [];
for (let i = 1; i < lines.length; i++) {
  const [email, password, companyName] = lines[i].split('\t');
  
  // Create a user object and add it to the array
  users.push({
    email,
    password,
    companyName
  });
}

// Write the JSON array to users.json
fs.writeFileSync('users.json', JSON.stringify(users, null, 2));

console.log(`Successfully converted ${users.length} users from users.txt to users.json`);