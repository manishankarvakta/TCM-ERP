console.log("CWD:", process.cwd());
const path = require("path");
const fs = require("fs");
const backupDir = path.join(process.cwd(), "backups");
console.log("Backup Dir:", backupDir);
if (fs.existsSync(backupDir)) {
    console.log("Contents of backup dir:");
    const types = ["database", "files", "full"];
    types.forEach(t => {
        const d = path.join(backupDir, t);
        if (fs.existsSync(d)) {
            console.log(`- ${t}:`, fs.readdirSync(d));
        } else {
            console.log(`- ${t}: (missing)`);
        }
    });
} else {
    console.log("Backup dir does not exist at", backupDir);
}
