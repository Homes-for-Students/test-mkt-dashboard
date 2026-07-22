import * as fs from 'fs';
import * as path from 'path';

const targetPath = path.resolve(process.cwd(), 'client/src/components/WebsitePerformance.tsx');
let content = fs.readFileSync(targetPath, 'utf-8');

// Replace variations in <option> tags
content = content.replace(/>View 5 rows<\/option>/g, '>Show 5 rows</option>');
content = content.replace(/>View 10 rows<\/option>/g, '>Show 10 rows</option>');
content = content.replace(/>View 20 rows<\/option>/g, '>Show 20 rows</option>');
content = content.replace(/>View all rows<\/option>/g, '>Show all rows</option>');

content = content.replace(/>Top 5 rows<\/option>/g, '>Show 5 rows</option>');
content = content.replace(/>Top 10 rows<\/option>/g, '>Show 10 rows</option>');
content = content.replace(/>Top 20 rows<\/option>/g, '>Show 20 rows</option>');
content = content.replace(/>All rows<\/option>/g, '>Show all rows</option>');

fs.writeFileSync(targetPath, content);
console.log('Replaced texts successfully!');
