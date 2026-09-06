import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export function getInstanceUrlPath(): string {
  return path.join(app.getPath('userData'), 'instance-url.json');
}

export function loadInstanceUrl(): string | null {
  try {
    const data = JSON.parse(fs.readFileSync(getInstanceUrlPath(), 'utf-8'));
    return typeof data.url === 'string' ? data.url : null;
  } catch {
    return null;
  }
}

export function loadDirectConnection(): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(getInstanceUrlPath(), 'utf-8'));
    return data.directConnection === true;
  } catch {
    return false;
  }
}

export function saveInstanceUrl(url: string, directConnection = false): void {
  fs.writeFileSync(
    getInstanceUrlPath(),
    JSON.stringify({ url, directConnection }),
  );
}

export function clearInstanceUrl(): void {
  try {
    fs.unlinkSync(getInstanceUrlPath());
  } catch {
    // File may not exist — ignore
  }
}

export function getPickerPath(): string {
  return path.join(__dirname, '..', 'resources', 'instance-picker.html');
}
