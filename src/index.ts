require("dotenv").config();
const express = require("express");
const Multer = require("multer");
import slugify from "slugify";
import { uploadFile } from "./storage";
import * as Mongo from "mongodb";
import fetch from "node-fetch";

async function main() {
  try {
    const client = new Mongo.MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db("prod");

    const app = express();

    const PORT = process.env.PORT || 3000;

    app.use(express.json());

    const multer = Multer({
      storage: Multer.memoryStorage(),
      limits: {
        fileSize: 90 * 1024 * 1024, // no larger than 90mb, you can change as needed.
      },
    });

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    app.post("/upload", multer.any(), async (req, res) => {
      let id = new Mongo.ObjectId();
      const data = JSON.parse(req.body.data);
      let files = req.files.sort((a, b) => {
        return a.fieldname.localeCompare(b.fieldname);
      });
      const folderName =
        slugify(data.title, { lower: true }) +
        "-" +
        id.toString().substring(18, 25);

      const bassPromise = uploadFile(files[0], folderName);
      const drumsPromise = uploadFile(files[1], folderName);
      const instrPromise = uploadFile(files[2], folderName);
      const vocalsPromise = uploadFile(files[3], folderName);

      const urls = await Promise.all([
        bassPromise,
        drumsPromise,
        instrPromise,
        vocalsPromise,
      ]);

      const song = {
        _id: id,
        title: data.title,
        artist: data.artist,
        album: data.album,
        previewUrl: data.previewUrl,
        bpm: data.bpm,
        bass: urls[0],
        drums: urls[1],
        instr: urls[2],
        vocals: urls[3],
      };

      await db.collection("songs").insertOne(song);

      res.json(song);
    });

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.log(err);
  }
}
main();
