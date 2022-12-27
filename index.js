const express = require('express');
const cors = require('cors');
require('dotenv').config();
//mongodb requir 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const  jwt = require('jsonwebtoken');
//express and port setup
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SEC_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
//mongodb url setup$
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y0awskk.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
  try {
    await client.connect();
    const serviceCollections = client.db('doctorsPortal').collection('services');
    const bookingCollections = client.db('doctorsPortal').collection('bookings');
    const userCollections = client.db('doctorsPortal').collection('users');

    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollections.find(query);
      const servicess = await cursor.toArray();
      res.send(servicess);
    });

    app.get('/available', async (req, res) => {
      const date = req.query.date;
      const services = await serviceCollections.find().toArray();
      const query = { date: date };
      const bookings = await bookingCollections.find(query).toArray();

      services.forEach(service => {
        const serviceBooking = bookings.filter(book => book?.treatment === service.name);
        const bookedslot = serviceBooking.map( book=> book.slot);
        const available = service.slots.filter(slot => !bookedslot.includes(slot));
        service.slots = available;
      })
      res.send(services);
    });


    app.get('/booking', async (req, res) => {
      const query = {};
      const cursor = bookingCollections.find(query);
      const servicess = await cursor.toArray();
      res.send(servicess);
    });

    app.get('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingCollections.findOne(query);
      res.send(booking);
  })

    app.get('/user', async (req, res) => {
      const user = await userCollections.find().toArray();
      res.send(user);
    });
    app.put('/user/admin/email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set:  {role:'admin'}
      };
      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);
    });


    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set:  user
      };
      const result = await userCollections.updateOne(filter, updateDoc, options);
      const token= jwt.sign({email:email} , process.env.ACCESS_TOKEN,  { expiresIn: '1h' })
      res.send({result , token});
    });

    app.post('/booking', async (req, res) => {
      const bookings = req.body;
      const authorized = req.headers.authorization;
      const query = { treatment: bookings.treatment, date: bookings.date, patient: bookings.patient };
      const exists = await bookingCollections.findOne(query);
      if (exists) {
        return res.send({success:false, bookings:exists})
      }
      else {
        const result = await bookingCollections.insertOne(bookings);
        return res.send({success:true, result});
     }
    });

    app.post('/create-payment-intent', async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })

    });

    

  }
  finally {

  }
}
run().catch(console.log);

app.get('/', (req, res) => {
  res.send('Doctors Portal Running')
})

app.listen(port, () => {
  console.log(`ours app listening on port ${port}`)
})