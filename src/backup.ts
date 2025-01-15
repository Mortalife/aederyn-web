import { $ } from "bun";

async function createBackup() {
  try {
    const result = await $`sqlite3 ${
      process.env["DATABASE_PATH"] ?? ""
    }local.db ".backup ${
      process.env["DATABASE_PATH"] ?? ""
    }local.db.${Date.now()}.bak"`;

    if (result.exitCode === 0) {
      console.log("Backup on main database created successfully.");
    } else {
      console.error(
        `Backup on main database failed with exit code ${result.exitCode}`
      );
      if (result.stderr) {
        console.error(`Error: ${result.stderr.toString()}`);
      }
    }

    const sessionResult = await $`sqlite3 ${
      process.env["DATABASE_PATH"] ?? ""
    }local.sessions.db ".backup ${
      process.env["DATABASE_PATH"] ?? ""
    }local.sessions.db.${Date.now()}.bak"`;

    if (sessionResult.exitCode === 0) {
      console.log("Backup of sessions created successfully.");
    } else {
      console.error(
        `Backup of sessions failed with exit code ${result.exitCode}`
      );
      if (sessionResult.stderr) {
        console.error(`Error: ${sessionResult.stderr.toString()}`);
      }
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

createBackup();
