import * as fs from 'fs';
import * as path from 'path';

// Parse logic that returns RAW code string (with quotes or whatever was there?)
// Or just normalized key vs raw val.
function parseCodeRaw(line: string) {
  const valsMatch = line.match(/VALUES \((.+)\);/);
  if (!valsMatch) return null;
  const rawVals = valsMatch[1];
  let current = '';
  const vals = [];
  let inQuote = false;
  for (let i = 0; i < rawVals.length; i++) {
    const c = rawVals[i];
    if (c === "'" && rawVals[i+1] === "'") { current += "'"; i++; }
    else if (c === "'") { inQuote = !inQuote; }
    else if (c === ',' && !inQuote) { vals.push(current); current = ''; } // Push RAW (untrimmed)
    else { current += c; }
  }
  vals.push(current);
  
  // Code is 2nd column
  return vals[1]; // Raw string, e.g. " 'ES-H206 ' " or "'ES-H206'"
}

// Helper to clean raw code for Key
function cleanRaw(raw: string) {
    let s = raw.trim(); // Trim spaces around quotes
    if (s.startsWith("'") && s.endsWith("'")) s = s.substring(1, s.length - 1);
    return s.trim(); // Trim content
}

function fix() {
    const filePath = path.join(process.cwd(), 'item.sql');
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Pass 1: Count keys
    const counts = new Map<string, number>();
    lines.forEach(line => {
        if (!line.startsWith('INSERT INTO')) return;
        const raw = parseCodeRaw(line);
        if (raw) {
             const key = cleanRaw(raw); // Normalized key "ES-H206"
             counts.set(key, (counts.get(key) || 0) + 1);
        }
    });

    const dups = new Set<string>();
    counts.forEach((val, key) => { 
        if(val > 1) {
            console.log(`Duplicate Key: ${key} (${val})`);
            dups.add(key);
        }
    });

    if (dups.size === 0) {
        console.log("No duplicates found.");
        return;
    }

    // Pass 2: Rewrite
    const seen = new Map<string, number>();
    const fixedLines = lines.map(line => {
        if (!line.startsWith('INSERT INTO')) return line;
        
        const raw = parseCodeRaw(line);
        if (!raw) return line;
        
        const key = cleanRaw(raw);
        if (dups.has(key)) {
            const count = seen.get(key) || 0;
            seen.set(key, count + 1);
            
            if (count > 0) {
                // Determine new code
                const newCodeVal = `${key}-${count + 1}`;
                
                // Replace RAW string in line.
                // Raw string: e.g. " 'ES-H206 ' "
                // We want to replace it with: "'ES-H206-2'" (normalized quoted)
                // Use strict replace on the raw substring
                // Be careful not to replace other columns if they have same value?
                // But full RAW string includes quotes, likely unique enough in context?
                // Or rebuild line? Rebuilding is safer but complex.
                // Replace raw with new quoted value.
                
                return line.replace(raw, `'${newCodeVal}'`); 
            }
        }
        return line;
    });
    
    fs.writeFileSync(filePath, fixedLines.join('\n'));
    console.log("✅ Rewrote item.sql");
}

fix();
