import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../config/brandColorsDb.json');

export interface BrandColor {
  brand: string;
  fullName?: string;
  backgroundColor: string;
  secondaryColor?: string;
  textColor: string;
}

export class BrandColorStore {
  private static load(): Record<string, BrandColor> {
    if (!fs.existsSync(DB_PATH)) {
      return {};
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private static save(colors: Record<string, BrandColor>): void {
    fs.writeFileSync(DB_PATH, JSON.stringify(colors, null, 2));
  }

  static getAll(): Record<string, BrandColor> {
    return this.load();
  }

  static upsert(color: BrandColor): BrandColor {
    const colors = this.load();
    const key = color.brand.toLowerCase();
    colors[key] = {
      brand: color.brand,
      fullName: color.fullName,
      backgroundColor: color.backgroundColor,
      secondaryColor: color.secondaryColor,
      textColor: color.textColor,
    };
    this.save(colors);
    return colors[key];
  }
}
