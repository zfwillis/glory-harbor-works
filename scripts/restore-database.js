const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is required to restore a backup.");
  process.exit(1);
}

const args = process.argv.slice(2);
const dropExisting = args.includes("--drop");
const dirIndex = args.indexOf("--dir");
const backupRoot = path.join(process.cwd(), "backups");

const resolveBackupDir = () => {
  if (dirIndex >= 0 && args[dirIndex + 1]) {
    const providedDir = args[dirIndex + 1];
    return path.isAbsolute(providedDir) ? providedDir : path.join(process.cwd(), providedDir);
  }

  if (!fs.existsSync(backupRoot)) {
    throw new Error("No backups directory exists yet.");
  }

  const candidates = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(backupRoot, entry.name))
    .sort();

  if (candidates.length === 0) {
    throw new Error("No backup folders were found.");
  }

  return candidates[candidates.length - 1];
};

const restoreUploads = (backupDir) => {
  const uploadsSourceDir = path.join(backupDir, "uploads");
  const uploadsTargetDir = path.join(process.cwd(), "server", "uploads");

  if (!fs.existsSync(uploadsSourceDir)) {
    return false;
  }

  if (dropExisting && fs.existsSync(uploadsTargetDir)) {
    fs.rmSync(uploadsTargetDir, { recursive: true, force: true });
  }

  fs.mkdirSync(path.dirname(uploadsTargetDir), { recursive: true });
  fs.cpSync(uploadsSourceDir, uploadsTargetDir, { recursive: true });
  return true;
};

const run = async () => {
  const backupDir = resolveBackupDir();
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    const collectionFiles = fs
      .readdirSync(backupDir)
      .filter((fileName) => fileName.endsWith(".json") && fileName !== "metadata.json");

    for (const fileName of collectionFiles) {
      const collectionName = path.basename(fileName, ".json");
      const filePath = path.join(backupDir, fileName);
      const documents = EJSON.parse(fs.readFileSync(filePath, "utf8"));
      const collection = db.collection(collectionName);

      if (dropExisting) {
        await collection.deleteMany({});
      }

      if (Array.isArray(documents) && documents.length > 0) {
        await collection.insertMany(documents);
      }
    }

    const uploadsRestored = restoreUploads(backupDir);

    console.log(
      `Backup restored from ${backupDir}${uploadsRestored ? " with uploaded files restored." : "."}`
    );
  } catch (error) {
    console.error("Restore failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
