require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const bodyParser = require("body-parser");
const pdf = require("html-pdf");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const path = require("path");

const pdfTemplate = require("./documents");

const app = express();
const PORT = process.env.PORT || 4000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const URI = process.env.MONGO_URI;

const googleclient = new OAuth2Client(GOOGLE_CLIENT_ID);
const mongoclient = new MongoClient(URI);

let DB;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, "/public")));

// Database connection
async function connectToDatabase() {
  try {
    await mongoclient.connect();
    console.log("Connected to MongoDB!");
    DB = mongoclient.db("resumebuilder");
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
  }
}

connectToDatabase();

// Helper function for Google token verification
const verifyGoogleToken = async (token) => {
  try {
    const ticket = await googleclient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    return { payload: ticket.getPayload() };
  } catch (error) {
    console.error("Google token verification error:", error);
    return { error: "Invalid user detected. Please try again" };
  }
};

// Routes
app.post("/signup", async (req, res) => {
  try {
    if (req.body.credential) {
      const verificationResponse = await verifyGoogleToken(req.body.credential);

      if (verificationResponse.error) {
        return res.status(400).json({
          message: verificationResponse.error,
        });
      }

      const profile = verificationResponse?.payload;
      const user = {
        firstName: profile?.given_name,
        lastName: profile?.family_name,
        picture: profile?.picture,
        email: profile?.email,
        token: jwt.sign(
          { email: profile?.email },
          process.env.GOOGLE_CLIENT_SECRET,
          {
            expiresIn: "1d",
          }
        ),
      };

      const result = await DB.collection("users").insertOne(user);
      res.status(201).json({
        message: "Signup was successful",
        user: user,
      });
    } else {
      res.status(400).json({ message: "Credential is missing" });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "An error occurred. Registration failed.",
      error: error.message,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    if (req.body.credential) {
      const verificationResponse = await verifyGoogleToken(req.body.credential);
      if (verificationResponse.error) {
        return res.status(400).json({
          message: verificationResponse.error,
        });
      }

      const profile = verificationResponse?.payload;
      const user = await DB.collection("users").findOne({ email: profile?.email });

      if (!user) {
        return res.status(400).json({
          message: "You are not registered. Please sign up",
        });
      }

      const resumeDoc = await DB.collection("resume").findOne({ userid: user?._id.toString() });

      res.status(200).json({
        message: "Login was successful",
        resume: resumeDoc,
        user: {
          firstName: profile?.given_name,
          lastName: profile?.family_name,
          picture: profile?.picture,
          email: profile?.email,
          token: jwt.sign(
            { email: profile?.email },
            process.env.GOOGLE_CLIENT_SECRET,
            {
              expiresIn: "1d",
            }
          ),
        },
      });
    } else {
      res.status(400).json({ message: "Credential is missing" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      message: "An error occurred during login.",
      error: err.message,
    });
  }
});

app.post("/save", (req, res) => {
  const { user, resume } = req.body;
  delete resume.step;

  DB.collection("users")
    .findOne({ email: user.email })
    .then((userDoc) => {
      const USERID = userDoc._id.toString();
      const data = {
        userid: USERID,
        ...resume,
      };
      DB.collection("resume")
        .findOne({ userid: USERID })
        .then((resumeDoc) => {
          if (resumeDoc) {
            DB.collection("resume")
              .deleteOne({ userid: USERID })
              .then(() => {
                DB.collection("resume")
                  .insertOne(data)
                  .then(() => res.sendStatus(200))
                  .catch((err) => res.send(err));
              })
              .catch((err) => console.log(err));
          } else {
            DB.collection("resume")
              .insertOne(data)
              .then(() => res.sendStatus(200))
              .catch((err) => res.send(err));
          }
        });
    });
});

app.post("/get-resume", (req, res) => {
  const { email } = req.body;
  DB.collection("users")
    .findOne({ email: email })
    .then((userDoc) => {
      const USERID = userDoc._id.toString();
      DB.collection("resume")
        .findOne({ userid: USERID })
        .then((resumeDoc) => {
          if (resumeDoc) {
            delete resumeDoc._id;
            delete resumeDoc.userid;
            res.send(resumeDoc);
          }
        });
    });
});

// POST route for PDF generation....
app.post("/create-pdf", (req, res) => {
  const options = { timeout: 300000 }; 
  pdf.create(pdfTemplate(req.body), options).toFile("Resume.pdf", (err) => {
    if (err) {
      console.log(err);
      res.send(Promise.reject());
    } else res.send(Promise.resolve());
  });
});

app.get("/", (req, res) => {
  res.send("Hello from 'Resume Builder' Web App");
});

// GET route -> send generated PDF to client...
app.get("/fetch-pdf", (req, res) => {
  const file = `${__dirname}/Resume.pdf`;
  res.download(file);
});


