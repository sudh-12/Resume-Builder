require("dotenv").config({ path: __dirname + "/.env" });

const crypto = require("crypto");
const express = require("express");
const bodyParser = require("body-parser");
const pdf = require("html-pdf");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const path = require("path");
const pdfTemplate = require("./documents");


const app = express();
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
server.timeout = 300000;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const URI = process.env.MONGO_URI;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const googleclient = new OAuth2Client(GOOGLE_CLIENT_ID);
const mongoclient = new MongoClient(URI);


let DB;
try {
  // Connect to the MongoDB cluster
  mongoclient.connect();
  console.log("Connected to MongoDB !");
  DB = mongoclient.db("resumebuilder");
} catch (e) {
  console.error(e);
}

const options = {
  height: "42cm",
  width: "35.7cm",
  timeout: "6000",
  childProcessOptions: {
    env: {
      OPENSSL_CONF: '/dev/null',
    },
  }
};


const s3 = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
});

app.use(cors());
app.use(
  cors({
    origin: "https://resume-builder-lemon-one.vercel.app",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "/public")));

const verifyGoogleToken = async (token) => {
  try {
    const ticket = await googleclient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    return { payload: ticket.getPayload() };
  } catch (error) {
    return { error: "Invalid user detected. Please try again", e: error };
  }
};

app.post("/verifyToken", (req, res) => {
  const token = req.body.token;
  jwt.verify(token, process.env.GOOGLE_CLIENT_SECRET, (err, decodedToken) => {
    if (
      err &&
      (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError")
    ) {
      res.status(401).json({
        message: err,
      });
    }

    const email = decodedToken?.email;

    DB.collection("users")
      .findOne({ email: email })
      .then((user) => {
        if (!user) {
          return res.status(400).json({
            message: "You are not registered. Please sign up",
          });
        } else {
          if (Date.now() < decodedToken.exp * 1000) {
            return res.status(200).json({ status: "Success" });
          }
        }
      });
  });
});

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

      DB.collection("users")
        .insertOne(user)
        .then((resp) => {
          res.status(201).json({
            message: "Signup was successful",
            user: user,
          });
        });
    }
  } catch (error) {
    res.status(500).json({
      message: "An error occurred. Registration failed. " + error,
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
      DB.collection("users")
        .findOne({ email: profile?.email })
        .then((user) => {
          if (!user) {
            return res.status(400).json({
              message: "You are not registered. Please sign up",
            });
          }
          DB.collection("resume")
            .findOne({ userid: user?._id.toString() })
            .then((resumeDoc) => {
              res.status(201).json({
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
            });
        });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err?.message || err,
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



app.get("/", (req, res) => {
  res.send("Hello from 'Resume Builder' Web App");
});


// app.post("/create-pdf", async (req, res) => {
//   try {
//     const pdfPath = `temp_resume_${Date.now()}.pdf`;
//     pdf.create(pdfTemplate(req.body)).toFile(pdfPath, async (err) => {
//       if (err) {
//         console.error("PDF generation error:", err);
//         return res.status(500).json({ error: "Error generating PDF" });
//       }

//       fs.readFile(pdfPath, async (err, data) => {
//         if (err) {
//           console.error("File read error:", err);
//           return res.status(500).json({ error: "Error reading PDF file" });
//         }

//         const fileName = `resumes/${Date.now()}.pdf`;
//         const params = {
//           Bucket: S3_BUCKET,
//           Key: fileName,
//           Body: data,
//           ContentType: "application/pdf",
//         };

//         try {
//           const command = new PutObjectCommand(params);
//           await s3.send(command);
//           const fileUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}`;

//           const { email } = req.body;
//           const userDoc = await DB.collection("users").findOne({ email });
//           if (userDoc) {
//             await DB.collection("resume").updateOne(
//               { userid: userDoc._id.toString() },
//               { $set: { s3Url: fileUrl } },
//               { upsert: true }
//             );
//           }

//           fs.unlinkSync(pdfPath);
//           res.json({ success: true, fileUrl });
//         } catch (uploadError) {
//           console.error("S3 upload error:", uploadError);
//           res.status(500).json({ error: "Error uploading PDF to S3" });
//         }
//       });
//     });
//   } catch (error) {
//     console.error("Unexpected error:", error);
//     res.status(500).json({ error: "Unexpected server error" });
//   }
// });

app.post("/create-pdf", async (req, res) => {
  try {
    const { email } = req.body;
    const userDoc = await DB.collection("users").findOne({ email });

    if (!userDoc) {
      return res.status(404).json({ error: "User not found" });
    }

    const USERID = userDoc._id.toString();

    // Generate a hash (checksum) of the new resume data
    const resumeHash = crypto.createHash("sha256").update(JSON.stringify(req.body)).digest("hex");
    const fileName = `resumes/resume_${resumeHash}.pdf`;

    // Step 1: Check MongoDB for existing hash
    const existingResume = await DB.collection("resume").findOne({ userid: USERID });

    if (existingResume && existingResume.resumeHash === resumeHash) {
      console.log("No changes detected in resume. Returning existing file.");
      return res.json({ success: true, fileUrl: existingResume.s3Url });
    }

    // Step 2: Check if file already exists in S3
    const headParams = {
      Bucket: S3_BUCKET,
      Key: fileName,
    };

    try {
      await s3.send(new HeadObjectCommand(headParams));
      console.log("Existing resume found in S3. Returning previous file URL.");
      
      // Update MongoDB with the new hash and existing S3 URL
      await DB.collection("resume").updateOne(
        { userid: USERID },
        { $set: { resumeHash, s3Url: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}`, updatedAt: new Date() } },
        { upsert: true }
      );

      return res.json({ success: true, fileUrl: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}` });
    } catch (error) {
      if (error.name !== "NotFound") {
        console.error("S3 head request error:", error);
        return res.status(500).json({ error: "Error checking S3 for existing file" });
      }
    }

    // Step 3: If file doesn't exist in S3, generate a new PDF
    const pdfPath = `temp_resume_${Date.now()}.pdf`;
    pdf.create(pdfTemplate(req.body)).toFile(pdfPath, async (err) => {
      if (err) {
        console.error("PDF generation error:", err);
        return res.status(500).json({ error: "Error generating PDF" });
      }

      fs.readFile(pdfPath, async (err, data) => {
        if (err) {
          console.error("File read error:", err);
          return res.status(500).json({ error: "Error reading PDF file" });
        }

        // Upload the new PDF to S3
        const params = {
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: data,
          ContentType: "application/pdf",
        };

        try {
          const command = new PutObjectCommand(params);
          await s3.send(command);

          // Construct the S3 URL
          const fileUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}`;

          // Save the file URL and hash in MongoDB
          await DB.collection("resume").updateOne(
            { userid: USERID },
            { $set: { s3Url: fileUrl, resumeHash, updatedAt: new Date() } },
            { upsert: true }
          );

          fs.unlinkSync(pdfPath);
          res.json({ success: true, fileUrl });
        } catch (uploadError) {
          console.error("S3 upload error:", uploadError);
          res.status(500).json({ error: "Error uploading PDF to S3" });
        }
      });
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Unexpected server error" });
  }
});


app.get("/fetch-pdf", async (req, res) => {
  try {
    const { email } = req.query;
    const userDoc = await DB.collection("users").findOne({ email });
    if (!userDoc) return res.status(404).send("User not found");

    const resumeDoc = await DB.collection("resume").findOne({ userid: userDoc._id.toString() });
    if (!resumeDoc || !resumeDoc.s3Url) {
      return res.status(404).send("Resume not found in S3");
    }

    res.json({ fileUrl: resumeDoc.s3Url });
  } catch (error) {
    console.error("Fetch PDF error:", error);
    res.status(500).send("Error fetching PDF");
  }
});



