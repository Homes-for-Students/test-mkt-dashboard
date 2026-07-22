const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({
  origin: ["https://test.kexin-wu.workers.dev/"],
  credentials: true
}));
app.get('/', (req, res) => res.json({ok: true}));
app.listen(3001, () => console.log('started'));
