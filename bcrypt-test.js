const bcrypt = require('bcryptjs');

(async () => {
  const plain = 'Admin#123';

  // Generar hash
  const hash = await bcrypt.hash(plain, 10);
  console.log('HASH:', hash);

  // Verificar hash
  const ok = await bcrypt.compare(plain, hash);
  console.log('COMPARE:', ok);
})();
