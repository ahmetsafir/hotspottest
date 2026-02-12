import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 3000;

const HOST = process.env.HOST || '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`PMS Gateway listening on ${HOST}:${PORT}`);
});
