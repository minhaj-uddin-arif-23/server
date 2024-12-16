const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 9000;
const app = express();
const cookieParser = require("cookie-parser");
app.use(
  cors({
    origin: [`http://localhost:5173`],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// next middleware
const verify = (req, res, next) => {
  console.log("This is verified middleware");
  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized User access 1" });
  }

  jwt.verify(token, process.env.jwt_secret, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized User access 2" });
    }
    req.user = decode;
    next();
  });
};

/*
 cookie parser
Storing session information.
Tracking user preferences.
Handling authentication tokens.
*/
const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_password}@cluster0.wclmi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const jobPoster = client.db("JobPosterdb").collection("jobs");

    // singin api from jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.jwt_secret, { expiresIn: "1h" });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false, // because our website do not have http[s] http://localhost:5173/login
          sameSite: "none",
          maxAge: 3600 * 1000,
        })
        .send({ success: true });
    });

    // job add korar api
    app.post("/add-job", async (req, res) => {
      const allJob = req.body;
      const result = await jobPoster.insertOne(allJob);
      res.send(result);
    });
    // job added data show in database to ui
    app.get("/jobs", verify, async (req, res) => {
      console.log("Home route");
      const findData = await jobPoster.find().toArray();
      res.send(findData);
    });

    // get all job posted specific user job post get by email

    app.get("/job/:email", verify, async (req, res) => {
      const email = req.params.email;

      // if(req.user.email !== req.params.email){
      //   return res.status(403).send({message:'Forbidden Access'})
      // }

      const query = { "buyer.email": email };
      console.log("Cokkie is my job posted id", req.cookies);

      const result = await jobPoster.find(query).toArray();
      res.send(result);
    });

    // delete specific data in my job posted
    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobPoster.deleteOne(query);
      res.send(result);
    });

    //update
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobPoster.findOne(query);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
