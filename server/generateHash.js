const bcrypt = require('bcryptjs');

const password = '1234567890'; // your plain password
const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Hashed password:', hash);
});
