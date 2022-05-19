const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3el01.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('doctors_portal').collection('services');
    const bookingCollection = client.db('doctors_portal').collection('bookings');


    // API Naming Convention
    /**
     * app.get('/booking') // get all bookings in this collection or get one by filter 
     * app.get('/booking/:id') // get a specific booking 
     * app.post('/booking/:id') // add a new booking 
     * app.patch('/booking/:id') // update specific one
     * app.delete('/booking/:id') // delete specific one
     */


    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    })

    // Warning:
    // This is not the proper way to query
    // After learning more about mongodb. Use aggregate lookup, pipeline, match, group
    app.get('/available', async (req, res) => {
      const date = req.query.date;
      // step 1: get all services
      const services = await serviceCollection.find().toArray();

      // step 2: get the bookings of the day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // step 3: for each service
      services.forEach(service => {
        // step 4: find bookings for that service. Output: [{},{},{},{},{},{}] 
        const serviceBookings = bookings.filter(book => book.treatment === service.name);
        // step 5: select slots for the service bookings. Output: ['','','','','',''] 
        const booked = serviceBookings.map(book => book.slot);
        // step 6: select those slots that are not in bookedSlots
        const available = service.slots.filter(slot => !booked.includes(slot));
        // step 7: set available to slots to make it easier
        service.slots = available;
      })

      res.send(services)
    })

    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists })
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result })
    })
  }

  finally {

  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello From Doctors Server!')
})

app.listen(port, () => {
  console.log(`Doctors App listening on port ${port}`)
})