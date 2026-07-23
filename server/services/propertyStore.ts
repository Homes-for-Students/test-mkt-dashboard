import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../config/propertiesDb.json');

export interface Property {
  id: string;
  name: string;
  brand: string;
  city: string;
  beds: number;
  occupancyRate: number;
  websiteUrl?: string;
  ga4PagePath?: string;
  googleMapsPlaceId?: string;
  googleBusinessProfileId?: string;
  studentCrowdId?: string;
  client?: string;
}

export class PropertyStore {
  private static load(): Property[] {
    if (!fs.existsSync(DB_PATH)) {
      return [];
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private static save(properties: Property[]): void {
    fs.writeFileSync(DB_PATH, JSON.stringify(properties, null, 2));
  }

  static getAll(): Property[] {
    return this.load();
  }

  static getById(id: string): Property | undefined {
    return this.load().find(p => p.id === id);
  }

  static add(property: Omit<Property, 'id' | 'ga4PagePath'>): Property {
    const properties = this.load();
    let ga4PagePath = '';
    if (property.websiteUrl) {
       let urlStr = property.websiteUrl.trim();
       if (!urlStr.startsWith('http')) urlStr = 'https://' + urlStr;
       try { ga4PagePath = new URL(urlStr).pathname; } catch(e) {}
    }

    const newProperty: Property = {
      ...property,
      ga4PagePath,
      id: `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    properties.push(newProperty);
    this.save(properties);
    return newProperty;
  }

  static update(id: string, updates: Partial<Omit<Property, 'id' | 'ga4PagePath'>>): Property | null {
    const properties = this.load();
    const index = properties.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    let ga4PagePath = properties[index].ga4PagePath;
    if (updates.websiteUrl) {
       let urlStr = updates.websiteUrl.trim();
       if (!urlStr.startsWith('http')) urlStr = 'https://' + urlStr;
       try { ga4PagePath = new URL(urlStr).pathname; } catch(e) {}
    }

    const updatedProperty = { ...properties[index], ...updates, ga4PagePath };
    properties[index] = updatedProperty;
    this.save(properties);
    return updatedProperty;
  }

  static delete(id: string): boolean {
    const properties = this.load();
    const filtered = properties.filter(p => p.id !== id);
    if (filtered.length === properties.length) return false;
    
    this.save(filtered);
    return true;
  }
}
