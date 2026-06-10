import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

// 1. Move directories
const dashboardDir = 'app/(dashboard)/dashboard';
const procurementsDir = path.join(dashboardDir, 'procurements');

if (!fs.existsSync(procurementsDir)) {
  fs.mkdirSync(procurementsDir, { recursive: true });
}

// Map of source -> dest
const moves = [
  { src: path.join(dashboardDir, 'purchases', 'grn'), dest: path.join(procurementsDir, 'grn') },
  { src: path.join(dashboardDir, 'purchases'), dest: path.join(procurementsDir, 'purchases') },
  { src: path.join(dashboardDir, 'rtv'), dest: path.join(procurementsDir, 'rtv') },
  { src: path.join(dashboardDir, 'inventory', 'tpn'), dest: path.join(procurementsDir, 'tpn') },
];

for (const { src, dest } of moves) {
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`Moved ${src} to ${dest}`);
  }
}

// 2. String Replacements
const replacements = [
  // Paths
  { from: /"\/dashboard\/purchases\/grn/g, to: '"/dashboard/procurements/grn' },
  { from: /`\/dashboard\/purchases\/grn/g, to: '`/dashboard/procurements/grn' },
  
  { from: /"\/dashboard\/purchases/g, to: '"/dashboard/procurements/purchases' },
  { from: /`\/dashboard\/purchases/g, to: '`/dashboard/procurements/purchases' },

  { from: /"\/dashboard\/rtv/g, to: '"/dashboard/procurements/rtv' },
  { from: /`\/dashboard\/rtv/g, to: '`/dashboard/procurements/rtv' },

  { from: /"\/dashboard\/inventory\/tpn/g, to: '"/dashboard/procurements/tpn' },
  { from: /`\/dashboard\/inventory\/tpn/g, to: '`/dashboard/procurements/tpn' },

  // Imports
  { from: /@\/app\/\(dashboard\)\/dashboard\/purchases\//g, to: '@/app/(dashboard)/dashboard/procurements/purchases/' },
  { from: /@\/app\/\(dashboard\)\/dashboard\/rtv\//g, to: '@/app/(dashboard)/dashboard/procurements/rtv/' },
  { from: /@\/app\/\(dashboard\)\/dashboard\/inventory\/tpn\//g, to: '@/app/(dashboard)/dashboard/procurements/tpn/' },

  // Permission Keys
  { from: /permissionKey: "purchases\.purchases"/g, to: 'permissionKey: "procurements.purchases"' },
  { from: /permissionKey: "purchases\.grn"/g, to: 'permissionKey: "procurements.grn"' },
  { from: /permissionKey: "rtv\.rtv"/g, to: 'permissionKey: "procurements.rtv"' },
  { from: /permissionKey: "inventory\.tpn"/g, to: 'permissionKey: "procurements.tpn"' },

  { from: /permissionKey="purchases\.purchases"/g, to: 'permissionKey="procurements.purchases"' },
  { from: /permissionKey="purchases\.grn"/g, to: 'permissionKey="procurements.grn"' },
  { from: /permissionKey="rtv\.rtv"/g, to: 'permissionKey="procurements.rtv"' },
  { from: /permissionKey="inventory\.tpn"/g, to: 'permissionKey="procurements.tpn"' },
];

let filesProcessed = 0;
let filesChanged = 0;

walkDir('.', (filePath) => {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.md')) return;
  // Skip this script itself
  if (filePath.endsWith('refactor_procurements.ts') || filePath.endsWith('patch_nav.ts')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  for (const rep of replacements) {
    newContent = newContent.replace(rep.from, rep.to);
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    filesChanged++;
    console.log(`Updated ${filePath}`);
  }
  filesProcessed++;
});

console.log(`Processed ${filesProcessed} files, changed ${filesChanged} files.`);
