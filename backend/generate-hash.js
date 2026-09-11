const bcrypt = require("bcrypt");

// Jangan hardcode password di source code. Kirim lewat argumen CLI:
//   node generate-hash.js "PasswordRahasiaYangKuat"
const password = process.argv[2];

if (!password) {
  console.error("Usage: node generate-hash.js <password>");
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log(hash);
})();
