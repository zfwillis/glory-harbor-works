const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is required to create a backup.");
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(process.cwd(), "backups");
const backupDir = path.join(backupRoot, timestamp);
const uploadsSourceDir = path.join(process.cwd(), "server", "uploads");
const uploadsBackupDir = path.join(backupDir, "uploads");

const run = async () => {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    fs.mkdirSync(backupDir, { recursive: true });

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const savedCollections = [];

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      if (!collectionName || collectionName.startsWith("system.")) {
        continue;
      }

      const documents = await db.collection(collectionName).find({}).toArray();
      const collectionFile = path.join(backupDir, `${collectionName}.json`);

      fs.writeFileSync(collectionFile, EJSON.stringify(documents, null, 2), "utf8");
      savedCollections.push({ name: collectionName, count: documents.length });
    }

    let uploadsBackedUp = false;
    if (fs.existsSync(uploadsSourceDir)) {
      fs.cpSync(uploadsSourceDir, uploadsBackupDir, { recursive: true });
      uploadsBackedUp = true;
    }

    fs.writeFileSync(
      path.join(backupDir, "metadata.json"),
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          database: db.databaseName,
          collections: savedCollections,
          uploadsBackedUp,
        },
        null,
        2
      ),
      "utf8"
    );

    console.log(`Backup created at ${backupDir}`);
  } catch (error) {
    console.error("Backup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
