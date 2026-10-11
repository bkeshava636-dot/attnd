import fs from 'fs';
import path from 'path';

const gradleFile = path.resolve('node_modules/@capacitor/local-notifications/android/build.gradle');

if (fs.existsSync(gradleFile)) {
  let content = fs.readFileSync(gradleFile, 'utf8');
  let updated = false;

  if (content.includes('JavaVersion.VERSION_21')) {
    content = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
    updated = true;
  }
  if (content.includes('jvmToolchain(21)')) {
    content = content.replace(/jvmToolchain\(21\)/g, 'jvmToolchain(17)');
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(gradleFile, content, 'utf8');
    console.log('[patch-local-notifications] Patched build.gradle to use Java 17 / jvmToolchain(17)');
  }
}
