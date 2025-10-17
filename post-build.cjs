#!/usr/bin/env node

/**
 * Post-build script to fix common issues after Vite build
 * This prevents the need to manually fix the same issues repeatedly
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Running post-build fixes...');

// 1. Create lib directory and copy commentNavigator.js
const libDir = path.join(__dirname, 'dist', 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
  console.log('✅ Created dist/lib directory');
}

const commentNavigatorSrc = path.join(__dirname, 'src', 'lib', 'commentNavigator.js');
const commentNavigatorDest = path.join(libDir, 'commentNavigator.js');

if (fs.existsSync(commentNavigatorSrc)) {
  fs.copyFileSync(commentNavigatorSrc, commentNavigatorDest);
  console.log('✅ Copied commentNavigator.js');
}

// 2. Create assets directory
const assetsDir = path.join(__dirname, 'dist', 'assets', 'images');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('✅ Created dist/assets/images directory');
}

// 3. Fix popup.html script reference
const popupHtmlPath = path.join(__dirname, 'dist', 'src', 'ui', 'popup', 'popup.html');
if (fs.existsSync(popupHtmlPath)) {
  let content = fs.readFileSync(popupHtmlPath, 'utf8');
  
  // Fix script reference
  if (content.includes('<script src="popup.js"></script>')) {
    content = content.replace(
      '<script src="popup.js"></script>',
      '<script src="../../../popup2.js"></script>'
    );
    fs.writeFileSync(popupHtmlPath, content);
    console.log('✅ Fixed popup.html script reference');
  }
}

// 4. Fix commentNavigator.js ES6 export issue
if (fs.existsSync(commentNavigatorDest)) {
  let content = fs.readFileSync(commentNavigatorDest, 'utf8');
  
  // Remove export keyword for content script compatibility
  if (content.includes('export class CommentNavigator')) {
    content = content.replace('export class CommentNavigator', 'class CommentNavigator');
    fs.writeFileSync(commentNavigatorDest, content);
    console.log('✅ Fixed commentNavigator.js export');
  }
}

console.log('🎉 Post-build fixes completed!');
