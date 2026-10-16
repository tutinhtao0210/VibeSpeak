import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import simulatorRouter from './routers/simulator';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/simulators', simulatorRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
