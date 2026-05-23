const JSZip = require("jszip");
const AdmZip = require("adm-zip");
const fs = require("fs");

async function test() {
    const zip = new JSZip();
    zip.file("metadata.json", JSON.stringify({ id: "test", type: "database" }));
    zip.file("database.dump", "fake dump data");
    
    const buffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
    });
    
    const testPath = "test_jszip.zip";
    fs.writeFileSync(testPath, buffer);
    
    try {
        const adm = new AdmZip(testPath);
        const entry = adm.getEntry("metadata.json");
        if (entry) {
            console.log("AdmZip successfully read metadata.json");
            console.log("Content:", adm.readAsText(entry));
        } else {
            console.log("AdmZip FAILED to find metadata.json");
        }
    } catch (e) {
        console.log("AdmZip FAILED to open ZIP:", e.message);
    } finally {
        if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
    }
}

test();
